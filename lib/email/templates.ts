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
