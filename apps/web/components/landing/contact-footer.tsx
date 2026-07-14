export function ContactFooter({
  displayName,
  email,
  phone,
  address,
}: {
  displayName: string;
  email: string;
  phone: string;
  address: string;
}) {
  const hasContactInfo = email || phone || address;

  return (
    <footer className="border-t border-border px-6 py-10 text-center text-sm text-muted-foreground">
      {hasContactInfo && (
        <address className="mx-auto mb-3 flex flex-col items-center gap-1 not-italic">
          {address && <p>{address}</p>}
          <div className="flex gap-4">
            {email && (
              <a href={`mailto:${email}`} className="hover:text-foreground">
                {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="hover:text-foreground">
                {phone}
              </a>
            )}
          </div>
        </address>
      )}
      <p className="text-xs">
        &copy; {new Date().getFullYear()} {displayName}
      </p>
    </footer>
  );
}
