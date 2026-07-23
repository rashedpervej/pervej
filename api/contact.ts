import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { addLeadLocal, updateLeadLocal } from "./localDb";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== "https://your-supabase-project.supabase.co"
);

const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null;

export default async function contactHandler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { name, email, phone, company, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Name, email, subject, and message are required" });
    }

    // Extract visitor IP address safely
    let ip = "";
    const xForwardedFor = req.headers["x-forwarded-for"];
    if (xForwardedFor) {
      ip = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(",")[0].trim();
    } else {
      ip = req.socket.remoteAddress || "";
    }

    // Clean up local IP formats if needed
    if (ip === "::1" || ip === "::ffff:127.0.0.1") {
      ip = "127.0.0.1";
    }

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
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || "no-reply@portfolio.com";

    let emailSent = false;
    let emailErrorMsg = "";
    let previewUrl = "";

    try {
      let transporter;
      if (smtpHost && smtpUser && smtpPass) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        console.log(`Using custom SMTP server: ${smtpHost}:${smtpPort}`);
      } else {
        console.log("SMTP environment variables not configured. Creating Ethereal sandbox test account...");
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log("Created Ethereal test account successfully.");
      }

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

      const mailOptions = {
        from: smtpHost ? smtpFrom : `"Portfolio Leads" <${transporter.options.auth?.user}>`,
        to: "rashedpervej2011@gmail.com",
        subject: `📩 [New Lead] ${subject} - from ${name}`,
        text: `New Lead Submission Received:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not specified"}\nCompany: ${company || "Not specified"}\nSubject: ${subject}\nMessage: ${message}\nTime: ${submissionTimeStr}\nIP: ${ip}`,
        html: emailHtml
      };

      const info = await transporter.sendMail(mailOptions);
      emailSent = true;

      if (!smtpHost) {
        previewUrl = nodemailer.getTestMessageUrl(info) || "";
        console.log(`Ethereal email preview available at: ${previewUrl}`);
      } else {
        console.log(`Email successfully dispatched. MessageId: ${info.messageId}`);
      }
    } catch (mailErr: any) {
      console.error("Failed to send email notification:", mailErr);
      emailErrorMsg = mailErr.message || "Failed to send email";
    }

    // 3. Post-save update: if we used Ethereal, append the preview URL to the local database and Supabase lead's notes
    // so that the admin can view and test the email directly from the dashboard!
    if (previewUrl && dbSuccess && insertedRecord) {
      try {
        const noteText = `Demo Sandbox: Click to view email notification that arrived: ${previewUrl}`;
        
        // Update locally
        updateLeadLocal(insertedRecord.id, { notes: noteText });
        insertedRecord.notes = noteText;

        if (supabase) {
          if (savedMethod === "local_and_supabase_leads") {
            await supabase
              .from("leads")
              .update({ notes: noteText })
              .eq("email", email)
              .eq("subject", subject);
          }
        }
        console.log("Successfully appended Ethereal test inbox preview link to local and database record notes.");
      } catch (updateErr) {
        console.warn("Failed to write email preview URL back to database notes:", updateErr);
      }
    }

    // Send positive response with results
    return res.status(200).json({
      success: true,
      message: "Lead received and logged successfully",
      savedInDatabase: dbSuccess,
      dbMethod: savedMethod || "none_simulation",
      emailSent,
      emailPreviewUrl: previewUrl || null,
      emailError: emailErrorMsg || null,
      dbError: dbErrorMsg || null,
      leadRecord: insertedRecord
    });

  } catch (globalErr: any) {
    console.error("Exception occurred in contactHandler:", globalErr);
    return res.status(500).json({
      error: "Internal Server Error",
      details: globalErr.message
    });
  }
}
