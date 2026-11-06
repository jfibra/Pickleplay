export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hasAdminRole = (roles) =>
  Array.isArray(roles) && roles.some((role) => String(role).toUpperCase() === 'ADMIN');

const isAdminIdentity = (profile, authUser) => {
  const meta = authUser?.app_metadata || {};
  return (
    hasAdminRole(profile?.roles)
    || String(profile?.active_role || '').toUpperCase() === 'ADMIN'
    || hasAdminRole(meta.roles)
    || String(meta.active_role || '').toUpperCase() === 'ADMIN'
    || meta.is_admin === true
  );
};

export const normalizeStatus = (value) => {
  const status = String(value || 'Active').trim().toLowerCase();
  if (status === 'suspended') return 'Suspended';
  // Court manager signups store 'Pending Court Manager Approval'.
  if (status.startsWith('pending')) return 'Pending';
  return 'Active';
};

// PostgREST `or()` filters are comma/paren delimited, so those characters cannot be
// passed through from user input.
export const sanitizeSearch = (value) =>
  String(value || '')
    .replace(/[,()*%\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

export const displayNameOf = (profile) =>
  profile?.full_name || profile?.username || profile?.email || 'Unknown user';

export const sendAdminError = (res, err, fallback) => {
  console.error(fallback, err);
  const message = err?.code === '23505' ? 'That value is already taken by another user.' : err?.message || fallback;
  res.status(err?.code === '23505' ? 409 : 500).json({ error: message });
};

export const createAdminToolkit = ({ supabaseAdmin, requireSupabaseAdmin, requireAuthenticatedSession }) => {
  const requireAdmin = async (req, res) => {
    const guard = requireSupabaseAdmin();
    if (!guard.ok) {
      res.status(500).json({ error: guard.message });
      return null;
    }

    const session = await requireAuthenticatedSession(req, res);
    if (!session) return null;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, email, active_role, roles, account_status, deleted_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return null;
    }

    if (
      !isAdminIdentity(profile, session.user)
      || profile?.deleted_at
      || normalizeStatus(profile?.account_status) === 'Suspended'
    ) {
      res.status(403).json({ error: 'Admin access required.' });
      return null;
    }

    return { user: session.user, profile };
  };

  const rejectSelf = (admin, target, res, message) => {
    if (admin.user.id === target.id) {
      res.status(400).json({ error: message });
      return true;
    }
    return false;
  };

  const logAction = async (admin, { action, target, targetName, details, eventType = 'AUDIT' }) => {
    const { error } = await supabaseAdmin.from('system_logs').insert({
      event_type: eventType,
      action,
      agent_id: admin.user.id,
      agent_name: displayNameOf(admin.profile),
      target_id: target.id,
      target_name: targetName ?? displayNameOf(target),
      details,
      ip_address: 'Admin console',
    });
    if (error) console.warn('Unable to write admin audit log:', error.message);
  };

  return { requireAdmin, rejectSelf, logAction };
};
