/**
 * Group-wise Permission Configuration
 * Maps Metabase group IDs to dashboard access rules
 *
 * Metabase Groups:
 *   ID=2  Administrators          (Metabase built-in superadmin)
 *   ID=4  Operation Team          (developer/tester account)
 *   ID=5  BTRC Administrators     (IT Manager, System Admin)
 *   ID=6  Management Team         (CEO, CTO)
 *   ID=7  Operations Team         (PM, QoS Analyst)
 *   ID=8  Regional Officers       (Dhaka Officer, Chittagong Officer)
 *   ID=9  External Viewers        (Consultant)
 */

// Tab keys used in RegulatoryDashboard
export const TABS = {
  SLA:      'r2.1',
  REGIONAL: 'r2.2',
  VIOLATION:'r2.3',
};

/**
 * Permission rules keyed by Metabase group ID.
 * Priority: first matching group (highest privilege) wins.
 */
export const GROUP_PERMISSIONS = {
  // Metabase built-in Administrators (superuser)
  2: {
    label:       'Administrator',
    tabs:        [TABS.SLA, TABS.REGIONAL, TABS.VIOLATION],
    readOnly:    false,
    divisionLock: null,   // null = no restriction
    showViolationDetail: true,
    showISPFilter: true,
  },

  // BTRC Administrators (IT Manager, System Admin)
  5: {
    label:       'BTRC Administrator',
    tabs:        [TABS.SLA, TABS.REGIONAL, TABS.VIOLATION],
    readOnly:    false,
    divisionLock: null,
    showViolationDetail: true,
    showISPFilter: true,
  },

  // Operation Team (developer/tester)
  4: {
    label:       'Operation Team',
    tabs:        [TABS.SLA, TABS.REGIONAL, TABS.VIOLATION],
    readOnly:    false,
    divisionLock: null,
    showViolationDetail: true,
    showISPFilter: true,
  },

  // Operations Team (PM, QoS Analyst)
  7: {
    label:       'Operations Team',
    tabs:        [TABS.SLA, TABS.REGIONAL, TABS.VIOLATION],
    readOnly:    false,
    divisionLock: null,
    showViolationDetail: true,
    showISPFilter: true,
  },

  // Management Team (CEO, CTO) — read-only, no violation detail
  6: {
    label:       'Management',
    tabs:        [TABS.SLA, TABS.REGIONAL],
    readOnly:    true,
    divisionLock: null,
    showViolationDetail: false,
    showISPFilter: false,
  },

  // Regional Officers — locked to their own division, no SLA tab
  8: {
    label:       'Regional Officer',
    tabs:        [TABS.REGIONAL, TABS.VIOLATION],
    readOnly:    false,
    divisionLock: 'BY_EMAIL', // resolved per user email (see REGIONAL_OFFICER_DIVISIONS)
    showViolationDetail: true,
    showISPFilter: true,
  },

  // External Viewers — read-only, R2.2 only
  9: {
    label:       'External Viewer',
    tabs:        [TABS.REGIONAL],
    readOnly:    true,
    divisionLock: null,
    showViolationDetail: false,
    showISPFilter: false,
  },
};

/**
 * Map Regional Officer emails → their locked division (DB name)
 */
export const REGIONAL_OFFICER_DIVISIONS = {
  'dhaka.officer@btrc.gov.bd':       'Dhaka',
  'chittagong.officer@btrc.gov.bd':  'Chattagram',
  // Add more as needed: 'sylhet.officer@btrc.gov.bd': 'Sylhet'
};

/** Priority order: higher index = lower priority */
const GROUP_PRIORITY = [2, 5, 4, 7, 6, 8, 9];

/**
 * Resolve the effective permissions for a user based on their group IDs.
 * If a user belongs to multiple groups, the highest-priority one wins.
 *
 * @param {number[]} groupIds - List of group IDs the user belongs to
 * @param {string}   email    - User email (for Regional Officer division lookup)
 * @returns {object} Resolved permission object
 */
export const resolvePermissions = (groupIds = [], email = '') => {
  // Find the highest-priority matching group
  for (const gid of GROUP_PRIORITY) {
    if (groupIds.includes(gid)) {
      const perm = { ...GROUP_PERMISSIONS[gid] };

      // Resolve division lock for Regional Officers
      if (perm.divisionLock === 'BY_EMAIL') {
        perm.divisionLock = REGIONAL_OFFICER_DIVISIONS[email] || null;
      }

      return perm;
    }
  }

  // Default: most restrictive (External Viewer)
  return { ...GROUP_PERMISSIONS[9] };
};

/**
 * Default permissions for the super-admin / developer account
 * Used when user has no matching group (e.g., plain Administrators group)
 */
export const ADMIN_PERMISSIONS = {
  label:       'Administrator',
  tabs:        [TABS.SLA, TABS.REGIONAL, TABS.VIOLATION],
  readOnly:    false,
  divisionLock: null,
  showViolationDetail: true,
  showISPFilter: true,
};
