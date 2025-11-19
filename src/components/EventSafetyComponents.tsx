import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Copy, MapPin, AlertCircle, HelpCircle } from "lucide-react";
import { LazyAvatar } from "@/components/LazyAvatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { normalizePhoneNumber } from "@/lib/phoneUtils";

interface WelfareContact {
  id: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  role: string | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

interface EmergencyField {
  label: string;
  name?: string;
  address?: string;
  phone?: string;
}

interface EmergencyInfo {
  nearest_hospital: string | null;
  hospital_address: string | null;
  hospital_phone: string | null;
  nearest_pharmacy: string | null;
  pharmacy_address: string | null;
  pharmacy_phone: string | null;
  on_duty_contact: string | null;
  on_duty_phone: string | null;
}

// Memoized Important Contacts Card
export const ImportantContactsCard = memo(({ 
  contacts, 
  onCopyPhone 
}: { 
  contacts: WelfareContact[];
  onCopyPhone: (phone: string) => void;
}) => {
  if (contacts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Important Contacts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex gap-3 rounded-lg border bg-muted/50 p-4"
            >
              <LazyAvatar 
                src={contact.avatar}
                alt={contact.name || "Contact"}
                fallback={(contact.name || "?").charAt(0).toUpperCase()}
                className="h-12 w-12"
              />
              <div className="flex-1">
                <p className="font-semibold">{contact.name || "Anonymous"}</p>
                {contact.role && (
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`tel:${normalizePhoneNumber(contact.phone)}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <Phone className="h-4 w-4" />
                      {normalizePhoneNumber(contact.phone)}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCopyPhone(normalizePhoneNumber(contact.phone!))}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

ImportantContactsCard.displayName = "ImportantContactsCard";

// Memoized Emergency Info Card
export const EmergencyInfoCard = memo(({ 
  emergencyInfo,
  customFields
}: { 
  emergencyInfo: EmergencyInfo | null | undefined;
  customFields: EmergencyField[];
}) => {
  const hasInfo = emergencyInfo && (
    emergencyInfo.nearest_hospital ||
    emergencyInfo.hospital_address ||
    emergencyInfo.hospital_phone ||
    emergencyInfo.nearest_pharmacy ||
    emergencyInfo.pharmacy_address ||
    emergencyInfo.pharmacy_phone ||
    emergencyInfo.on_duty_contact ||
    emergencyInfo.on_duty_phone ||
    customFields.length > 0
  );

  if (!hasInfo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Emergency Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {customFields.map((field, index) => (
          <div key={index} className="space-y-2">
            <h3 className="font-semibold text-lg">{field.label}</h3>
            <div className="space-y-1">
              {field.name && <p className="font-medium">{field.name}</p>}
              {field.address && (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {field.address}
                </p>
              )}
              {field.phone && (
                <a
                  href={`tel:${normalizePhoneNumber(field.phone)}`}
                  className="text-sm text-primary hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {normalizePhoneNumber(field.phone)}
                </a>
              )}
            </div>
          </div>
        ))}

        {emergencyInfo?.nearest_hospital && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Nearest Hospital</h3>
            <div className="space-y-1">
              <p className="font-medium">{emergencyInfo.nearest_hospital}</p>
              {emergencyInfo.hospital_address && (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {emergencyInfo.hospital_address}
                </p>
              )}
              {emergencyInfo.hospital_phone && (
                <a
                  href={`tel:${normalizePhoneNumber(emergencyInfo.hospital_phone)}`}
                  className="text-sm text-primary hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {normalizePhoneNumber(emergencyInfo.hospital_phone)}
                </a>
              )}
            </div>
          </div>
        )}

        {emergencyInfo?.nearest_pharmacy && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Nearest Pharmacy</h3>
            <div className="space-y-1">
              <p className="font-medium">{emergencyInfo.nearest_pharmacy}</p>
              {emergencyInfo.pharmacy_address && (
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {emergencyInfo.pharmacy_address}
                </p>
              )}
              {emergencyInfo.pharmacy_phone && (
                <a
                  href={`tel:${normalizePhoneNumber(emergencyInfo.pharmacy_phone)}`}
                  className="text-sm text-primary hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {normalizePhoneNumber(emergencyInfo.pharmacy_phone)}
                </a>
              )}
            </div>
          </div>
        )}

        {emergencyInfo?.on_duty_contact && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">On-Duty Contact</h3>
            <div className="space-y-1">
              <p className="font-medium">{emergencyInfo.on_duty_contact}</p>
              {emergencyInfo.on_duty_phone && (
                <a
                  href={`tel:${normalizePhoneNumber(emergencyInfo.on_duty_phone)}`}
                  className="text-sm text-primary hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {normalizePhoneNumber(emergencyInfo.on_duty_phone)}
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

EmergencyInfoCard.displayName = "EmergencyInfoCard";

// Memoized FAQs Card
export const FAQsCard = memo(({ faqs }: { faqs: FAQ[] }) => {
  if (faqs.length === 0) return null;

  return (
    <Card className="rounded-2xl hover:scale-[1.02] transition-all duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.id} value={`faq-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
});

FAQsCard.displayName = "FAQsCard";
