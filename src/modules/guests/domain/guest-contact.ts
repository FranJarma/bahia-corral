export type GuestContact = { firstName: string; lastName: string; phone: string; email?: string };
export function normalizeGuestContact(contact: GuestContact) {
  const firstName = contact.firstName.trim().replace(/\s+/g, ' ');
  const lastName = contact.lastName.trim().replace(/\s+/g, ' ');
  const email = contact.email?.trim().toLowerCase() || null;
  const phone = contact.phone.trim();
  const phoneDigits = phone.replace(/\D/g, '');
  return {
    firstName,
    lastName,
    email,
    phone,
    phoneDigits,
    identity: email
      ? 'email:' + email
      : 'contact:' + JSON.stringify([phoneDigits, firstName.toLowerCase(), lastName.toLowerCase()]),
  };
}
