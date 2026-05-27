export function formatPhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);

  return formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
}
