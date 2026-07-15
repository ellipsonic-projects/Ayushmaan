import { ContactsHeader } from "@/components/tenant/admin/contacts/contacts-header";
import { ContactsTable } from "@/components/tenant/admin/contacts/contacts-table";
import { getTenantContacts } from "@/lib/api/contacts.server";

export default async function TenantAdminContactsPage() {
  const contacts = await getTenantContacts();

  return (
    <div className="flex flex-col gap-6">
      <ContactsHeader />
      <ContactsTable initialContacts={contacts} />
    </div>
  );
}
