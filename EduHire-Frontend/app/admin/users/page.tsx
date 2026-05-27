'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Plus, Shield, ShieldOff, Users } from 'lucide-react';
import { Suspense, useState } from 'react';
import { adminApi, type AdminUser } from '../../../lib/api/admin';
import { AdminCreateUserDialog } from '../../../common-components/admin-create-user-dialog';
import { AdminUserDetailDialog } from '../../../common-components/admin-user-detail-dialog';
import AdminTablePagination from '../../../common-components/admin-table-pagination';
import AdminExportButton from '../../../common-components/admin-export-button';
import { SearchBar } from '../../../common-components/search-bar';
import { LocationAutocomplete } from '../../../common-components/location-autocomplete';
import { Button } from '../../../common-components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { DatePicker } from '../../../common-components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../common-components/ui/select';
import { useToast } from '../../../hooks/use-toast';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { Role, UserStatus } from '../../../lib/shared/enums';
import { downloadCsv } from '../../../lib/utils/export-csv';

function roleLabel(role: string) {
  if (role === 'JOB_SEEKER') return 'Teacher';
  if (role === 'RECRUITER') return 'School';
  return 'Admin';
}

function UserRow({
  user,
  onSuspend,
  onActivate,
  onViewDetail,
}: {
  user: AdminUser;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onViewDetail: (user: AdminUser) => void;
}) {
  const name = user.seekerProfile?.fullName ?? user.recruiterProfile?.fullName ?? '—';
  const isSuspended = user.status === UserStatus.SUSPENDED || user.isActive === false;

  return (
    <tr
      className="border-b border-border-default hover:bg-bg-page transition-colors cursor-pointer"
      onClick={() => onViewDetail(user)}
    >
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">{name}</p>
          <p className="text-xs text-text-muted">{user.email ?? user.phone ?? '—'}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          user.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
          user.role === Role.RECRUITER ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-600'
        }`}>{roleLabel(user.role)}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
        }`}>{isSuspended ? 'Suspended' : 'Active'}</span>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">
        {new Date(user.createdAt).toLocaleDateString('en-IN')}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {user.role !== Role.ADMIN && (
          isSuspended
            ? <Button size="sm" variant="outline" onClick={() => onActivate(user._id)}><Shield className="w-3.5 h-3.5 mr-1" />Activate</Button>
            : <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => onSuspend(user._id)}><ShieldOff className="w-3.5 h-3.5 mr-1" />Suspend</Button>
        )}
      </td>
    </tr>
  );
}

interface Filters {
  role: string;
  status: string;
  city: string;
  joinedFrom: string;
  joinedTo: string;
}

const DEFAULT_FILTERS: Filters = { role: 'ALL', status: 'ALL', city: '', joinedFrom: '', joinedTo: '' };

function activeFilterCount(f: Filters) {
  let count = 0;
  if (f.role !== 'ALL') count++;
  if (f.status !== 'ALL') count++;
  if (f.city) count++;
  if (f.joinedFrom || f.joinedTo) count++;
  return count;
}

function UsersContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);

  const isActiveParam = filters.status === 'ACTIVE' ? true : filters.status === 'SUSPENDED' ? false : undefined;
  const roleParam = filters.role === 'ALL' ? undefined : filters.role;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch, filters],
    queryFn: () => adminApi.listUsers(
      page, 10,
      debouncedSearch || undefined,
      roleParam,
      isActiveParam,
      filters.city || undefined,
      filters.joinedFrom || undefined,
      filters.joinedTo || undefined,
    ).then((r) => r.data),
  });

  const rows = data?.data ?? [];
  const badgeCount = activeFilterCount(filters);

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendUser(id),
    onSuccess: () => { toast({ title: 'User suspended' }); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => adminApi.activateUser(id),
    onSuccess: () => { toast({ title: 'User activated' }); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });

  const handleExport = () => {
    downloadCsv('admin-users', rows, [
      { header: 'Name', key: (u) => u.seekerProfile?.fullName ?? u.recruiterProfile?.fullName ?? '' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Role', key: 'role' },
      { header: 'Status', key: (u) => (u.isActive === false ? 'Suspended' : 'Active') },
      { header: 'Joined', key: (u) => new Date(u.createdAt).toLocaleDateString('en-IN') },
    ]);
  };

  const openFilter = () => { setDraft({ ...filters }); setFilterOpen(true); };
  const applyFilter = () => { setFilters(draft); setPage(1); setFilterOpen(false); };
  const clearFilter = () => { setDraft(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setPage(1); setFilterOpen(false); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><Users className="w-5 h-5" /> Users</h1>
          <p className="text-sm text-text-muted mt-0.5">{data?.meta.total ?? 0} total users</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchBar
            placeholder="Search email or phone…"
            onSearch={(v) => { setSearch(v); setPage(1); }}
            className="w-52"
          />
          <Button variant="outline" size="sm" onClick={openFilter} className="relative">
            <Filter className="w-3.5 h-3.5 mr-1" /> Filters
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] flex items-center justify-center">
                {badgeCount}
              </span>
            )}
          </Button>
          <AdminExportButton onExport={handleExport} disabled={!rows.length} />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create user
          </Button>
        </div>
      </div>

      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          </div>
        ) : !rows.length ? (
          <div className="p-10 text-center">
            <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm text-text-muted">No users found.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-bg-page border-b border-border-default">
                <tr>
                  {['Name / Contact', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <UserRow
                    key={u._id}
                    user={u}
                    onSuspend={(id) => suspendMutation.mutate(id)}
                    onActivate={(id) => activateMutation.mutate(id)}
                    onViewDetail={setDetailUser}
                  />
                ))}
              </tbody>
            </table>
            <AdminTablePagination
              page={page}
              totalPages={data?.meta.totalPages ?? 1}
              onPageChange={setPage}
              totalItems={data?.meta.total}
              pageSize={10}
            />
          </>
        )}
      </div>

      {/* Filter modal */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={draft.role} onValueChange={(v) => setDraft((p) => ({ ...p, role: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value={Role.JOB_SEEKER}>Teacher</SelectItem>
                  <SelectItem value={Role.RECRUITER}>School</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <LocationAutocomplete
                defaultValue={draft.city}
                placeholder="e.g. Hyderabad"
                onSelect={({ city }) => setDraft((p) => ({ ...p, city }))}
                onClear={() => setDraft((p) => ({ ...p, city: '' }))}
                inputClassName="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Joined Date Range</Label>
              <DatePicker
                mode="range"
                value={draft.joinedFrom && draft.joinedTo ? `${draft.joinedFrom} - ${draft.joinedTo}` : ''}
                onSelectionChange={(val) => {
                  const [from = '', to = ''] = val ? val.split(' - ') : [];
                  setDraft((p) => ({ ...p, joinedFrom: from, joinedTo: to }));
                }}
                inputPlaceholder="Select date range"
                inputClassName="h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={clearFilter} className="flex-1">Clear</Button>
            <Button size="sm" onClick={applyFilter} className="flex-1">Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AdminUserDetailDialog user={detailUser} onOpenChange={(open) => { if (!open) setDetailUser(null); }} />

      <AdminCreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          toast({ title: 'User created successfully' });
          qc.invalidateQueries({ queryKey: ['admin-users'] });
        }}
      />
    </div>
  );
}

export default function AdminUsersPage() {
  return <Suspense><UsersContent /></Suspense>;
}
