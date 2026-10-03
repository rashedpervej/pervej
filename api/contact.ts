import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import os from "os";

function getLocalDbPaths() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isServerless ? path.join(os.tmpdir(), "data") : path.join(process.cwd(), "data");
  const leadsFile = path.join(dataDir, "leads.json");
  return { dataDir, leadsFile };
}

let memoryLeads: any[] = [];

function readLeadsLocal(): any[] {
  try {
    const { dataDir, leadsFile } = getLocalDbPaths();
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (fs.existsSync(leadsFile)) {
      const data = fs.readFileSync(leadsFile, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {}
  return memoryLeads;
}

function writeLeadsLocal(leads: any[]): boolean {
  memoryLeads = leads;
  try {
    const { dataDir, leadsFile } = getLocalDbPaths();
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), "utf-8");
    return true;
  } catch (err) {
    return false;
  }
}

function addLeadLocal(lead: any): any {
  const leads = readLeadsLocal();
  const newLead = {
    ...lead,
    id: `lead_local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    status: "new",
    created_at: new Date().toISOString(),
    notes: lead.notes || "",
  };
  leads.unshift(newLead);
  writeLeadsLocal(leads);
  return newLead;
}

function updateLeadLocal(id: string, updates: any): any | null {
  const leads = readLeadsLocal();
  const index = leads.findIndex((l: any) => l.id === id);
  if (index !== -1) {
    leads[index] = { ...leads[index], ...updates };
    writeLeadsLocal(leads);
    return leads[index];
  }
  return null;
}

function getSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (
    !supabaseUrl || 
    !supabaseAnonKey || 
    supabaseUrl === "https://your-supabase-project.supabase.co"
  ) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Simple in-memory rate limiting: max 5 requests per 60 seconds per IP
const contactRateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  if (!ip) return false;
  const now = Date.now();
  const entry = contactRateLimits.get(ip);
  if (!entry || now > entry.resetTime) {
    contactRateLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  entry.count++;
  return false;
}

export default async function contactHandler(req: Request, res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabase();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Extract visitor IP address safely
    let ip = "";
    const xForwardedFor = req.headers["x-forwarded-for"];
    if (xForwardedFor) {
      ip = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(",")[0].trim();
    } else {
      ip = req.socket?.remoteAddress || "";
    }

    if (ip === "::1" || ip === "::ffff:127.0.0.1") {
      ip = "127.0.0.1";
    }

    // Check rate limit
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Too many requests. Please try again after a minute." });
    }

    let payload = req.body;
    if (!payload && typeof (req as any).on === "function") {
      try {
        const rawBody = await new Promise<string>((resolve, reject) => {
          let data = "";
          (req as any).on("data", (chunk: any) => { data += chunk; });
          (req as any).on("end", () => resolve(data));
          (req as any).on("error", (err: any) => reject(err));
        });
        if (rawBody) {
          payload = JSON.parse(rawBody);
        }
      } catch (e) {}
    }
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {}
    }

    let { name, email, phone, company, subject, message } = payload || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Valid email address is required" });
    }
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ error: "Subject is required" });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    name = name.trim().slice(0, 100);
    email = email.trim().slice(0, 254);
    subject = subject.trim().slice(0, 200);
    message = message.trim().slice(0, 5000);
    phone = typeof phone === "string" ? phone.trim().slice(0, 50) : "";
    company = typeof company === "string" ? company.trim().slice(0, 100) : "";

    console.log(`Processing contact submission from ${name} (${email}) [IP: ${ip}]`);

    // 1. Always save locally first to guarantee lead is collected and saved
    let dbSuccess = true;
    let dbErrorMsg = "";
    let insertedRecord = addLeadLocal({
      name,
      email,
      phone: phone || "",
      company: company || "",
      subject,
      message,
      notes: "",
      visitor_ip: ip
    });
    let savedMethod = "local_json_db";

    // 2. Replicate to Supabase if configured as a secondary durable store
    if (supabase) {
      try {
        console.log("Supabase is configured. Attempting to replicate lead to Supabase 'leads' table...");
        const { data, error } = await supabase
          .from("leads")
          .insert({
            name,
            email,
            phone: phone || null,
            company: company || null,
            subject,
            message,
            visitor_ip: ip,
            status: "new",
            notes: ""
          })
          .select();

        if (!error && data && data.length > 0) {
          savedMethod = "local_and_supabase_leads";
          // Store Supabase's ID in local record for direct sync if wanted,
          // or we can use the local one.
          console.log("Successfully replicated lead to Supabase 'leads' table.");
        } else {
          const errMsg = error?.message || "Unknown error";
          console.warn(`Direct save to 'leads' table failed: ${errMsg}. Trying analytics_events fallback...`);
          dbErrorMsg = errMsg;

          // Fallback to "analytics_events"
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("analytics_events")
            .insert({
              event_type: "lead_submit",
              event_details: {
                name,
                email,
                phone: phone || "",
                company: company || "",
                subject,
                message,
                visitor_ip: ip,
                status: "new",
                notes: "",
                created_at: new Date().toISOString()
              }
            })
            .select();

          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            savedMethod = "local_and_supabase_events_fallback";
            console.log("Successfully replicated lead to Supabase 'analytics_events' table as fallback.");
          } else {
            const fbErrMsg = fallbackError?.message || "Unknown error";
            console.error(`Fallback save to 'analytics_events' also failed: ${fbErrMsg}`);
            dbErrorMsg += ` | Fallback error: ${fbErrMsg}`;
          }
        }
      } catch (err: any) {
        console.error("Supabase replication failed with exception:", err);
        dbErrorMsg = err.message;
      }
    } else {
      console.warn("Supabase is not configured. Saved solely to local JSON database.");
    }

    // 2. Send email notification to rashedpervej2011@gmail.com
    const resendApiKey = process.env.RESEND_API_KEY;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "no-reply@portfolio.com";

    let emailSent = false;
    let emailErrorMsg = "";
    let previewUrl = "";

    try {
      const submissionTime = new Date().toISOString();
      const submissionTimeStr = new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #6366f1; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; margin: -25px -25px 25px -25px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em;">📩 New Lead Submission Received</h2>
          </div>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
            A new contact inquiry has been submitted through your visualizer portfolio website. The details are compiled below:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #374151; width: 30%;">Full Name</td>
                <td style="padding: 10px 0; font-size: 13px; color: #4b5563;">${name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #374151;">Email Address</td>
                <td style="padding: 10px 0; font-size: 13px; color: #4b5563;"><a href="mailto:${email}" style="color: #6366f1; text-decoration: none;">${email}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #374151;">Phone Number</td>
                <td style="padding: 10px 0; font-size: 13px; color: #4b5563;">${phone || "<em>Not specified</em>"}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #374151;">Company Name</td>
                <td style="padding: 10px 0; font-size: 13px; color: #4b5563;">${company || "<em>Not specified</em>"}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #374151;">Subject</td>
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #111827;">${subject}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #374151;">Submission Time</td>
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-family: monospace;">${submissionTimeStr}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; font-weight: 600; color: #374151;">Visitor IP</td>
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-family: monospace;">${ip || "Unknown"}</td>
              </tr>
            </tbody>
          </table>
          <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">Message Description</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated notification from your Lead Management module.</p>
          </div>
        </div>
      `;

      if (resendApiKey) {
        // High-priority: Send email via Resend API
        const resendFrom = process.env.RESEND_FROM || "Portfolio Contact <onboarding@resend.dev>";
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: resendFrom,
            to: ["rashedpervej2011@gmail.com"],
            reply_to: email,
            subject: `📩 [New Lead] ${subject} - from ${name}`,
            text: `New Lead Submission Received:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not specified"}\nCompany: ${company || "Not specified"}\nSubject: ${subject}\nMessage: ${message}\nTime: ${submissionTimeStr}\nIP: ${ip}`,
            html: emailHtml
          })
        });

        if (!resendResponse.ok) {
          const errBody = await resendResponse.json().catch(() => ({}));
          throw new Error(`Resend API HTTP ${resendResponse.status}: ${JSON.stringify(errBody)}`);
        }

        const resendData = await resendResponse.json();
        console.log(`Email dispatched via Resend API. ID: ${resendData?.id}`);
        emailSent = true;
      } else if (smtpHost && smtpUser && smtpPass) {
        // Secondary: Send via configured SMTP server
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const mailOptions = {
          from: smtpFrom,
          to: "rashedpervej2011@gmail.com",
          subject: `📩 [New Lead] ${subject} - from ${name}`,
          text: `New Lead Submission Received:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not specified"}\nCompany: ${company || "Not specified"}\nSubject: ${subject}\nMessage: ${message}\nTime: ${submissionTimeStr}\nIP: ${ip}`,
          html: emailHtml
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email dispatched via custom SMTP. MessageId: ${info.messageId}`);
        emailSent = true;
      } else if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
        // Local developer sandbox fallback only (never used in production)
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });

        const info = await transporter.sendMail({
          from: `"Portfolio Leads" <${testAccount.user}>`,
          to: "rashedpervej2011@gmail.com",
          subject: `📩 [New Lead] ${subject} - from ${name}`,
          text: `New Lead Submission Received:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not specified"}\nCompany: ${company || "Not specified"}\nSubject: ${subject}\nMessage: ${message}\nTime: ${submissionTimeStr}\nIP: ${ip}`,
          html: emailHtml
        });
        previewUrl = nodemailer.getTestMessageUrl(info) || "";
        console.log(`Local dev Ethereal preview: ${previewUrl}`);
        emailSent = true;
      } else {
        console.warn("No RESEND_API_KEY or SMTP credentials configured on production. Lead recorded to database.");
      }
    } catch (mailErr: any) {
      console.error("Failed to send email notification:", mailErr);
      emailErrorMsg = mailErr.message || "Failed to send email";
    }

    if (previewUrl && dbSuccess && insertedRecord && process.env.NODE_ENV !== "production") {
      try {
        const noteText = `Local Dev Sandbox: ${previewUrl}`;
        updateLeadLocal(insertedRecord.id, { notes: noteText });
        insertedRecord.notes = noteText;
      } catch (updateErr) {
        console.warn("Failed to write test preview to local note:", updateErr);
      }
    }

    // Send clean public response without leaking internal database IDs, visitor IP or sandbox links
    return res.status(200).json({
      success: true,
      message: "Your message has been sent successfully!"
    });

  } catch (globalErr: any) {
    console.error("Exception occurred in contactHandler:", globalErr);
    return res.status(500).json({
      error: "An unexpected error occurred while processing your request."
    });
  }
}
