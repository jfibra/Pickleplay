import express from 'express';
import {
  UUID_PATTERN,
  createAdminToolkit,
  displayNameOf,
  normalizeStatus,
  sanitizeSearch,
  sendAdminError as sendError,
} from './adminAuth.js';

const MANAGEABLE_ROLES = ['PLAYER', 'COACH', 'COURT_OWNER', 'COURT_MANAGER', 'ADMIN'];
const ACCOUNT_STATUSES = ['Active', 'Suspended'];
const PAGE_SIZES = [10, 25, 50, 100];
const PERMANENT_BAN = '876000h';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIST_COLUMNS = [
  'id',
  'full_name',
  'username',
  'email',
  'active_role',
  'roles',
  'account_status',
  'avatar_url',
  'dupr_rating',
  'location',
  'phone_verified',
  'id_verified',
  'skill_verified',
  'created_at',
  'updated_at',
  'deleted_at',
  'deleted_by',
  'deletion_reason',
].join(', ');

const toListItem = (profile, deletedByNames = new Map()) => ({
  id: profile.id,
  fullName: profile.full_name || '',
  username: profile.username || '',
  email: profile.email || '',
  activeRole: profile.active_role || 'PLAYER',
  roles: Array.isArray(profile.roles) && profile.roles.length > 0 ? profile.roles : [profile.active_role || 'PLAYER'],
  status: normalizeStatus(profile.account_status),
  avatarUrl: profile.avatar_url || null,
  duprRating: Number(profile.dupr_rating) || 0,
  location: profile.location || null,
  phoneVerified: Boolean(profile.phone_verified),
  idVerified: Boolean(profile.id_verified),
  skillVerified: Boolean(profile.skill_verified),
  createdAt: profile.created_at || null,
  updatedAt: profile.updated_at || null,
  deletedAt: profile.deleted_at || null,
  deletedBy: profile.deleted_by || null,
  deletedByName: profile.deleted_by ? deletedByNames.get(profile.deleted_by) || null : null,
  deletionReason: profile.deletion_reason || null,
});

export const createAdminUsersRouter = ({
  supabaseAdmin,
  requireSupabaseAdmin,
  requireAuthenticatedSession,
  limiter,
}) => {
  const router = express.Router();
  if (limiter) router.use(limiter);

  const { requireAdmin, rejectSelf, logAction } = createAdminToolkit({
    supabaseAdmin,
    requireSupabaseAdmin,
    requireAuthenticatedSession,
  });

  const loadTarget = async (req, res) => {
    const targetId = req.params.id;
    if (!UUID_PATTERN.test(targetId || '')) {
      res.status(400).json({ error: 'Invalid user id.' });
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(LIST_COLUMNS)
      .eq('id', targetId)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return null;
    }
    if (!data) {
      res.status(404).json({ error: 'User not found.' });
      return null;
    }
    return data;
  };

  const updateProfile = async (targetId, patch) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', targetId)
      .select(LIST_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  };

  const setAuthBan = async (userId, banned) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: banned ? PERMANENT_BAN : 'none',
    });
    if (error) throw error;
  };

  const resolveDeletedByNames = async (profiles) => {
    const ids = [...new Set(profiles.map((p) => p.deleted_by).filter(Boolean))];
    if (ids.length === 0) return new Map();
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, email')
      .in('id', ids);
    return new Map((data || []).map((p) => [p.id, displayNameOf(p)]));
  };

  router.get('/', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const pageSize = PAGE_SIZES.includes(Number(req.query.pageSize)) ? Number(req.query.pageSize) : 25;
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const tab = req.query.tab === 'deleted' ? 'deleted' : 'active';
      const role = MANAGEABLE_ROLES.includes(req.query.role) ? req.query.role : 'all';
      const status = ['Active', 'Suspended', 'Pending'].includes(req.query.status) ? req.query.status : 'all';
      const sort = req.query.sort === 'name' ? 'name' : 'date';
      const search = sanitizeSearch(req.query.search);

      let query = supabaseAdmin.from('profiles').select(LIST_COLUMNS, { count: 'exact' });

      query = tab === 'deleted' ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
      if (role !== 'all') query = query.eq('active_role', role);
      if (status === 'Suspended') query = query.eq('account_status', 'Suspended');
      else if (status === 'Pending') query = query.ilike('account_status', 'pending%');

      const orGroups = [];
      if (status === 'Active') orGroups.push('account_status.is.null,account_status.eq.Active');
      if (search) orGroups.push(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
      if (orGroups.length === 1) query = query.or(orGroups[0]);
      else if (orGroups.length > 1) query = query.or(`and(${orGroups.map((group) => `or(${group})`).join(',')})`);

      if (sort === 'name') {
        query = query.order('full_name', { ascending: true, nullsFirst: false });
      } else {
        query = query.order(tab === 'deleted' ? 'deleted_at' : 'created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const { data, error, count } = await query.range(from, from + pageSize - 1);
      if (error) throw error;

      const profiles = data || [];
      const deletedByNames = tab === 'deleted' ? await resolveDeletedByNames(profiles) : new Map();

      res.json({
        items: profiles.map((p) => toListItem(p, deletedByNames)),
        total: count ?? 0,
        page,
        pageSize,
      });
    } catch (err) {
      sendError(res, err, 'Failed to load users.');
    }
  });

  router.get('/summary', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const countProfiles = async (apply) => {
        const base = supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true });
        const { count, error } = await apply(base);
        if (error) throw error;
        return count ?? 0;
      };

      const live = (q) => q.is('deleted_at', null);

      const [total, active, suspended, deleted, ...roleCounts] = await Promise.all([
        countProfiles(live),
        countProfiles((q) => live(q).or('account_status.is.null,account_status.eq.Active')),
        countProfiles((q) => live(q).eq('account_status', 'Suspended')),
        countProfiles((q) => q.not('deleted_at', 'is', null)),
        ...MANAGEABLE_ROLES.map((role) => countProfiles((q) => live(q).eq('active_role', role))),
      ]);

      res.json({
        total,
        active,
        suspended,
        deleted,
        byRole: Object.fromEntries(MANAGEABLE_ROLES.map((role, index) => [role, roleCounts[index]])),
      });
    } catch (err) {
      sendError(res, err, 'Failed to load user summary.');
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;

      const deletedByNames = await resolveDeletedByNames([target]);
      res.json({ user: toListItem(target, deletedByNames) });
    } catch (err) {
      sendError(res, err, 'Failed to load user.');
    }
  });

  router.patch('/:id/profile', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;

      const { fullName, username, location, duprRating } = req.body || {};
      const patch = {};

      if (fullName !== undefined) {
        const value = String(fullName).trim();
        if (!value || value.length > 120) return res.status(400).json({ error: 'Full name must be 1-120 characters.' });
        patch.full_name = value;
      }
      if (username !== undefined) {
        const value = String(username).trim();
        if (value && !/^[a-zA-Z0-9_.]{3,30}$/.test(value)) {
          return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, dots or underscores.' });
        }
        patch.username = value || null;
      }
      if (location !== undefined) {
        patch.location = String(location).trim().slice(0, 200) || null;
      }
      if (duprRating !== undefined) {
        const value = Number(duprRating);
        if (!Number.isFinite(value) || value < 0 || value > 8) {
          return res.status(400).json({ error: 'DUPR rating must be between 0 and 8.' });
        }
        patch.dupr_rating = value;
      }

      if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update.' });

      const updated = await updateProfile(target.id, patch);
      await logAction(admin, {
        action: 'PROFILE_UPDATE',
        target,
        details: `Updated ${Object.keys(patch).join(', ')}`,
      });
      res.json({ user: toListItem(updated) });
    } catch (err) {
      sendError(res, err, 'Failed to update profile.');
    }
  });

  router.patch('/:id/role', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;
      if (rejectSelf(admin, target, res, 'You cannot change your own roles.')) return;

      const { activeRole, roles } = req.body || {};
      const nextRoles = [...new Set((Array.isArray(roles) ? roles : []).filter((r) => MANAGEABLE_ROLES.includes(r)))];
      if (nextRoles.length === 0) return res.status(400).json({ error: 'Select at least one role.' });
      if (!nextRoles.includes(activeRole)) return res.status(400).json({ error: 'Active role must be one of the selected roles.' });

      const updated = await updateProfile(target.id, { roles: nextRoles, active_role: activeRole });

      const { data: authRecord } = await supabaseAdmin.auth.admin.getUserById(target.id);
      if (authRecord?.user) {
        const existingMeta = authRecord.user.app_metadata || {};
        const nextMeta = { ...existingMeta, roles: nextRoles, active_role: activeRole };
        if (!nextRoles.includes('ADMIN')) delete nextMeta.is_admin;
        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(target.id, { app_metadata: nextMeta });
        if (metaError) console.warn('Unable to sync auth role metadata:', metaError.message);
      }

      await logAction(admin, {
        action: 'ROLE_UPDATE',
        target,
        details: `${(target.roles || []).join('/') || target.active_role} -> ${nextRoles.join('/')} (active: ${activeRole})`,
        eventType: 'SECURITY',
      });
      res.json({ user: toListItem(updated) });
    } catch (err) {
      sendError(res, err, 'Failed to update roles.');
    }
  });

  router.post('/:id/status', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;
      if (rejectSelf(admin, target, res, 'You cannot change your own account status.')) return;

      const status = req.body?.status;
      if (!ACCOUNT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
      if (target.deleted_at) return res.status(400).json({ error: 'Restore this user before changing their status.' });

      await setAuthBan(target.id, status === 'Suspended');
      const updated = await updateProfile(target.id, { account_status: status });

      await logAction(admin, {
        action: 'STATUS_UPDATE',
        target,
        details: `Status -> ${status}`,
        eventType: 'SECURITY',
      });
      res.json({ user: toListItem(updated) });
    } catch (err) {
      sendError(res, err, 'Failed to update status.');
    }
  });

  router.post('/:id/reset-password', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;

      const password = String(req.body?.password || '');
      if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be 8-72 characters.' });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, { password });
      if (error) throw error;

      await logAction(admin, {
        action: 'PASSWORD_RESET',
        target,
        details: 'Admin set a new password',
        eventType: 'SECURITY',
      });
      res.json({ success: true });
    } catch (err) {
      sendError(res, err, 'Failed to reset password.');
    }
  });

  router.post('/:id/change-email', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;

      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (email === String(target.email || '').toLowerCase()) {
        return res.status(400).json({ error: 'That is already the current email.' });
      }

      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .neq('id', target.id)
        .maybeSingle();
      if (existing) return res.status(409).json({ error: 'Another account already uses that email.' });

      const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, { email, email_confirm: true });
      if (error) throw error;

      const updated = await updateProfile(target.id, { email });
      await logAction(admin, {
        action: 'EMAIL_CHANGE',
        target,
        details: `${target.email || '(none)'} -> ${email}`,
        eventType: 'SECURITY',
      });
      res.json({ user: toListItem(updated) });
    } catch (err) {
      sendError(res, err, 'Failed to change email.');
    }
  });

  router.post('/:id/delete', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;
      if (rejectSelf(admin, target, res, 'You cannot delete your own account.')) return;
      if (target.deleted_at) return res.status(400).json({ error: 'User is already deleted.' });

      const reason = String(req.body?.reason || '').trim().slice(0, 500) || null;

      await setAuthBan(target.id, true);
      const updated = await updateProfile(target.id, {
        deleted_at: new Date().toISOString(),
        deleted_by: admin.user.id,
        deletion_reason: reason,
      });

      await logAction(admin, {
        action: 'USER_SOFT_DELETE',
        target,
        details: reason ? `Moved to Deleted Users: ${reason}` : 'Moved to Deleted Users',
        eventType: 'SECURITY',
      });
      res.json({ user: toListItem(updated) });
    } catch (err) {
      sendError(res, err, 'Failed to delete user.');
    }
  });

  router.post('/:id/restore', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;
      if (!target.deleted_at) return res.status(400).json({ error: 'User is not deleted.' });

      // A user suspended before deletion stays banned after restore.
      await setAuthBan(target.id, normalizeStatus(target.account_status) === 'Suspended');
      const updated = await updateProfile(target.id, {
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
      });

      await logAction(admin, {
        action: 'USER_RESTORE',
        target,
        details: 'Restored from Deleted Users',
        eventType: 'SECURITY',
      });
      res.json({ user: toListItem(updated) });
    } catch (err) {
      sendError(res, err, 'Failed to restore user.');
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const target = await loadTarget(req, res);
      if (!target) return;
      if (rejectSelf(admin, target, res, 'You cannot delete your own account.')) return;
      if (!target.deleted_at) {
        return res.status(400).json({ error: 'Move the user to Deleted Users before deleting permanently.' });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(target.id);
      if (error) throw error;

      // Covers schemas where profiles.id does not cascade from auth.users.
      await supabaseAdmin.from('profiles').delete().eq('id', target.id);

      await logAction(admin, {
        action: 'USER_PERMANENT_DELETE',
        target,
        details: 'Permanently deleted auth and profile records',
        eventType: 'SECURITY',
      });
      res.json({ success: true });
    } catch (err) {
      sendError(res, err, 'Failed to permanently delete user.');
    }
  });

  return router;
};
