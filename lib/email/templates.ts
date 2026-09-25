const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** F2/F3/F9 Swedish email templates. Plain, minimal HTML with a text fallback. */

export function magicLinkEmail(tenantName: string, link: string) {
  return {
    subject: `Logga in på ${tenantName}`,
    html: `<p>Hej!</p><p>Klicka på länken nedan för att logga in på <strong>${esc(tenantName)}</strong>:</p><p><a href="${esc(link)}">${esc(link)}</a></p><p>Länken är giltig en kort stund. Om du inte begärde detta kan du ignorera mejlet.</p>`,
    text: `Hej!\n\nKlicka på länken för att logga in på ${tenantName}:\n${link}\n\nOm du inte begärde detta kan du ignorera mejlet.`,
  };
}

export function newAccessRequestEmail(
  tenantName: string,
  requesterName: string,
  requesterEmail: string,
  adminUrl: string
) {
  return {
    subject: `Ny medlemsförfrågan hos ${tenantName}`,
    html: `<p>${esc(requesterName)} (${esc(requesterEmail)}) har begärt tillgång till ${esc(tenantName)}.</p><p><a href="${esc(adminUrl)}">Hantera förfrågan</a></p>`,
    text: `${requesterName} (${requesterEmail}) har begärt tillgång till ${tenantName}.\nHantera förfrågan: ${adminUrl}`,
  };
}

export function accessApprovedEmail(tenantName: string) {
  return {
    subject: `Du är godkänd hos ${tenantName}`,
    html: `<p>Din förfrågan hos ${esc(tenantName)} har godkänts. Du kan nu logga in och boka.</p>`,
    text: `Din förfrågan hos ${tenantName} har godkänts. Du kan nu logga in och boka.`,
  };
}

/** F4-R10/F4-R11: a booking got a conflict flag from a dans.se sync. */
export function conflictFlagEmail(tenantName: string, courseName: string) {
  return {
    subject: `Din bokning krockar med en kurs hos ${tenantName}`,
    html: `<p>En av dina bokningar hos <strong>${esc(tenantName)}</strong> krockar nu med kursen "${esc(courseName)}" som importerats från dans.se.</p><p>Bokningen är fortfarande bekräftad, men vi rekommenderar att du kontaktar klubben eller flyttar bokningen.</p>`,
    text: `En av dina bokningar hos ${tenantName} krockar nu med kursen "${courseName}" (importerad från dans.se). Bokningen är fortfarande bekräftad, men vi rekommenderar att du kontaktar klubben eller flyttar bokningen.`,
  };
}

/** F4-R11: booking moved or edited by someone else (an admin). */
export function bookingChangedByAdminEmail(
  tenantName: string,
  title: string,
  oldWhen: string,
  newWhen: string
) {
  return {
    subject: `Din bokning "${title}" har ändrats hos ${tenantName}`,
    html: `<p>Din bokning <strong>${esc(title)}</strong> hos ${esc(tenantName)} har ändrats av en administratör.</p><p>Från: ${esc(oldWhen)}<br/>Till: ${esc(newWhen)}</p>`,
    text: `Din bokning "${title}" hos ${tenantName} har ändrats av en administratör.\nFrån: ${oldWhen}\nTill: ${newWhen}`,
  };
}

/** F4-R11: booking cancelled by someone else (an admin). */
export function bookingCancelledByAdminEmail(
  tenantName: string,
  title: string,
  when: string
) {
  return {
    subject: `Din bokning "${title}" har ställts in hos ${tenantName}`,
    html: `<p>Din bokning <strong>${esc(title)}</strong> (${esc(when)}) hos ${esc(tenantName)} har ställts in av en administratör.</p>`,
    text: `Din bokning "${title}" (${when}) hos ${tenantName} har ställts in av en administratör.`,
  };
}

export function accessDeniedEmail(tenantName: string, reason: string | null) {
  return {
    subject: `Din förfrågan hos ${tenantName}`,
    html: `<p>Din förfrågan hos ${esc(tenantName)} har nekats.${
      reason ? ` Anledning: ${esc(reason)}` : ""
    }</p>`,
    text: `Din förfrågan hos ${tenantName} har nekats.${
      reason ? ` Anledning: ${reason}` : ""
    }`,
  };
}
