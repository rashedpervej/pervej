import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { readLeadsLocal, writeLeadsLocal, updateLeadLocal, deleteLeadLocal, Lead } from "./localDb";

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

// GET /api/leads - Merges local leads and Supabase leads
export async function getLeads(req: Request, res: Response) {
  try {
    const localLeads = readLeadsLocal();
    let supabaseLeads: any[] = [];
    let dbError = null;

    if (supabase) {
      try {
        // Fetch from "leads" table
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          supabaseLeads = data;
        } else {
          if (error) dbError = error.message;
          console.warn("Could not fetch leads from standard Supabase table:", error?.message);
        }

        // Also fetch from "analytics_events" as fallback
        const { data: eventsData, error: eventsError } = await supabase
          .from("analytics_events")
          .select("*")
          .eq("event_type", "lead_submit")
          .order("created_at", { ascending: false });

        if (!eventsError && eventsData) {
          const parsedFallbackLeads = eventsData.map((evt) => {
            const details = typeof evt.event_details === "string"
              ? JSON.parse(evt.event_details)
              : evt.event_details || {};
            return {
              id: evt.id,
              name: details.name || "Anonymous",
              email: details.email || "",
              phone: details.phone || "",
              company: details.company || "",
              subject: details.subject || "No Subject",
              message: details.message || "",
              status: details.status || "new",
              notes: details.notes || "",
              visitor_ip: details.visitor_ip || "",
              created_at: details.created_at || evt.created_at,
              isFallback: true
            };
          });

          // Merge fallback leads if they don't already exist in supabaseLeads
          parsedFallbackLeads.forEach((fbLead) => {
            const alreadyExists = supabaseLeads.some(
              (l) => l.email === fbLead.email && Math.abs(new Date(l.created_at).getTime() - new Date(fbLead.created_at).getTime()) < 5000
            );
            if (!alreadyExists) {
              supabaseLeads.push(fbLead);
            }
          });
        }
      } catch (err: any) {
        dbError = err.message;
        console.error("Supabase leads fetch exception:", err);
      }
    }

    // Merge localLeads and supabaseLeads
    // We use a Map to deduplicate based on email, subject, and close timestamps, or IDs
    const mergedMap = new Map<string, any>();

    // Add local leads first (they are always current)
    localLeads.forEach((l) => {
      // Create a unique signature key for matching potential duplicates
      const sig = `${l.email.toLowerCase()}_${l.subject.toLowerCase().replace(/\s+/g, "")}`;
      mergedMap.set(l.id, l);
      mergedMap.set(sig, l); // store by signature too
    });

    // Add supabase leads, merging with local ones if they match the signature
    supabaseLeads.forEach((s) => {
      const sig = `${s.email.toLowerCase()}_${s.subject.toLowerCase().replace(/\s+/g, "")}`;
      const existing = mergedMap.get(sig);

      if (existing) {
        // If we have a local copy and a remote copy, merge them. Keep any updated notes/status from remote if we want.
        // Usually local file has the latest status if it failed to save to Supabase.
        // Let's replace the signature entry with a combined version but keep the Supabase ID for database actions.
        const merged = {
          ...existing,
          id: s.id, // Prefer the Supabase ID so updates/deletes go to Supabase
          status: s.status || existing.status,
          notes: s.notes || existing.notes || s.notes,
          supabaseSynced: true,
          isFallback: s.isFallback
        };
        mergedMap.set(existing.id, merged);
        mergedMap.set(s.id, merged);
        mergedMap.set(sig, merged);
      } else {
        mergedMap.set(s.id, {
          ...s,
          supabaseSynced: true
        });
      }
    });

    // Reconstruct list keeping unique records by ID
    const finalLeadsList: any[] = [];
    const seenIds = new Set<string>();

    mergedMap.forEach((lead) => {
      if (!seenIds.has(lead.id)) {
        seenIds.add(lead.id);
        finalLeadsList.push(lead);
      }
    });

    // Sort by created_at descending
    finalLeadsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.status(200).json({
      success: true,
      leads: finalLeadsList,
      supabaseConfigured: isSupabaseConfigured,
      dbError
    });
  } catch (err: any) {
    console.error("Error in getLeads API:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}

// POST /api/leads/update - Updates lead status or notes locally and on Supabase
export async function updateLead(req: Request, res: Response) {
  try {
    const { id, status, notes, isFallback } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    let localSuccess = false;
    let supabaseSuccess = false;
    let errorMsg = "";

    // 1. Update in local file
    const localLead = updateLeadLocal(id, {
      ...(status && { status }),
      ...(notes !== undefined && { notes })
    });
    if (localLead) {
      localSuccess = true;
    }

    // 2. Update in Supabase if configured and not just local
    if (supabase && !id.startsWith("lead_local_")) {
      try {
        if (!isFallback) {
          const { error } = await supabase
            .from("leads")
            .update({
              ...(status && { status }),
              ...(notes !== undefined && { notes })
            })
            .eq("id", id);

          if (!error) {
            supabaseSuccess = true;
          } else {
            errorMsg = error.message;
          }
        } else {
          // Fallback event details update
          const { data: currentEvent, error: fetchErr } = await supabase
            .from("analytics_events")
            .select("event_details")
            .eq("id", id)
            .single();

          if (!fetchErr && currentEvent) {
            const details = typeof currentEvent.event_details === "string"
              ? JSON.parse(currentEvent.event_details)
              : currentEvent.event_details || {};

            const updatedDetails = {
              ...details,
              ...(status && { status }),
              ...(notes !== undefined && { notes })
            };

            const { error: updateErr } = await supabase
              .from("analytics_events")
              .update({ event_details: updatedDetails })
              .eq("id", id);

            if (!updateErr) {
              supabaseSuccess = true;
            } else {
              errorMsg = updateErr.message;
            }
          } else {
            errorMsg = fetchErr?.message || "Failed to fetch event details";
          }
        }
      } catch (err: any) {
        errorMsg = err.message;
        console.error("Exception in Supabase update:", err);
      }
    }

    return res.status(200).json({
      success: localSuccess || supabaseSuccess,
      localUpdated: localSuccess,
      supabaseUpdated: supabaseSuccess,
      error: errorMsg || null
    });
  } catch (err: any) {
    console.error("Error updating lead:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}

// POST /api/leads/delete - Deletes lead locally and on Supabase
export async function deleteLead(req: Request, res: Response) {
  try {
    const { id, isFallback } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    let localSuccess = false;
    let supabaseSuccess = false;
    let errorMsg = "";

    // 1. Delete locally
    localSuccess = deleteLeadLocal(id);

    // 2. Delete from Supabase
    if (supabase && !id.startsWith("lead_local_")) {
      try {
        if (!isFallback) {
          const { error } = await supabase
            .from("leads")
            .delete()
            .eq("id", id);

          if (!error) {
            supabaseSuccess = true;
          } else {
            errorMsg = error.message;
          }
        } else {
          const { error } = await supabase
            .from("analytics_events")
            .delete()
            .eq("id", id);

          if (!error) {
            supabaseSuccess = true;
          } else {
            errorMsg = error.message;
          }
        }
      } catch (err: any) {
        errorMsg = err.message;
        console.error("Exception in Supabase delete:", err);
      }
    }

    return res.status(200).json({
      success: localSuccess || supabaseSuccess,
      localDeleted: localSuccess,
      supabaseDeleted: supabaseSuccess,
      error: errorMsg || null
    });
  } catch (err: any) {
    console.error("Error deleting lead:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
