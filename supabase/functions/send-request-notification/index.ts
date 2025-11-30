import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string;
  requesterName: string;
  projectTitle: string;
  status: string;
  message?: string;
}

const getEmailContent = (status: string, requesterName: string, projectTitle: string, message?: string) => {
  const statusMessages: Record<string, { subject: string; content: string }> = {
    pending_approval: {
      subject: "Request Submitted Successfully",
      content: `Your request "${projectTitle}" has been submitted and is awaiting approval.`,
    },
    in_progress: {
      subject: "Request Approved - In Progress",
      content: `Great news! Your request "${projectTitle}" has been approved and is now in progress.`,
    },
    revision_needed: {
      subject: "Revision Needed for Your Request",
      content: `Your request "${projectTitle}" needs revision. Notes: ${message || "Please check the dashboard for details."}`,
    },
    completed: {
      subject: "Request Completed",
      content: `Your request "${projectTitle}" has been completed! You can download the final files from the dashboard.`,
    },
    rejected: {
      subject: "Request Rejected",
      content: `Unfortunately, your request "${projectTitle}" has been rejected. Reason: ${message || "Please contact the admin for details."}`,
    },
  };

  const emailData = statusMessages[status] || statusMessages.pending_approval;

  return {
    subject: emailData.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8B5CF6;">BnM Request System</h1>
        <h2>Hello ${requesterName},</h2>
        <p>${emailData.content}</p>
        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 10px 0 0 0;"><strong>Status:</strong> ${status.replace(/_/g, " ").toUpperCase()}</p>
        </div>
        <p>Please visit the dashboard to view more details.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
          Best regards,<br>
          Branding & Marketing Division<br>
          Ini Lho ITS! 2026
        </p>
      </div>
    `,
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, requesterName, projectTitle, status, message }: NotificationRequest = await req.json();

    const emailContent = getEmailContent(status, requesterName, projectTitle, message);

    const emailResponse = await resend.emails.send({
      from: "BnM ILI 2026 <onboarding@resend.dev>",
      to: [to],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-request-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
