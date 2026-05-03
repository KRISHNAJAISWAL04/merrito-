export function assertRequired(obj, fields) {
  const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length) throw new Error('Missing required fields: ' + missing.join(', '));
}

export function assertLeadPayload(body) {
  const fn = (body.first_name || '').trim();
  const ln = (body.last_name || '').trim();
  if (!fn || !ln) throw new Error('first_name and last_name are required');
}