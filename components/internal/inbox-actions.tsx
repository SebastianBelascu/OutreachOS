import {
  archiveInboundAction,
  markInboundReadAction,
  pauseEnrollmentFromInboxAction,
  setInboundClassificationAction,
  setLeadStatusFromInboxAction,
} from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { INBOUND_CLASSIFICATIONS } from "@/lib/outreach/constants";

interface InboxActionsProps {
  inboundMessageId: string;
  isRead: boolean;
  leadId: string | null;
  campaignId: string | null;
  classification: string;
}

export function InboxActions({
  inboundMessageId,
  isRead,
  leadId,
  campaignId,
  classification,
}: InboxActionsProps) {
  return (
    <div className="space-y-3 border-b p-3">
      {leadId ? (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Interested", status: "INTERESTED" },
            { label: "Not interested", status: "NOT_INTERESTED" },
            { label: "Meeting booked", status: "MEETING_BOOKED" },
          ].map((option) => (
            <form key={option.status} action={setLeadStatusFromInboxAction}>
              <input type="hidden" name="leadId" value={leadId} />
              <input type="hidden" name="status" value={option.status} />
              <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">
                {option.label}
              </Button>
            </form>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <form action={markInboundReadAction}>
          <input type="hidden" name="inboundMessageId" value={inboundMessageId} />
          <input type="hidden" name="isRead" value={isRead ? "false" : "true"} />
          <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
            Mark {isRead ? "unread" : "read"}
          </Button>
        </form>

        {leadId && campaignId ? (
          <form action={pauseEnrollmentFromInboxAction}>
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="campaignId" value={campaignId} />
            <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
              Pause sequence
            </Button>
          </form>
        ) : null}

        <form action={archiveInboundAction}>
          <input type="hidden" name="inboundMessageId" value={inboundMessageId} />
          <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
            Archive
          </Button>
        </form>

        <form action={setInboundClassificationAction} className="flex items-center gap-1">
          <input type="hidden" name="inboundMessageId" value={inboundMessageId} />
          <select
            name="classification"
            defaultValue={classification}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          >
            {INBOUND_CLASSIFICATIONS.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
          <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
            Set
          </Button>
        </form>
      </div>
    </div>
  );
}
