import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { 
  useListRequests, 
  useCreateRequest, 
  useUpdateRequestStatus,
  getListRequestsQueryKey
} from '@workspace/api-client-react';
import type { RequestInputType } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Plus, Loader2, CheckCircle2, XCircle, CalendarRange } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Requests() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data: requests = [], isLoading } = useListRequests();
  const createMutation = useCreateRequest();
  const updateMutation = useUpdateRequestStatus();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newType, setNewType] = useState<RequestInputType>('time_off');
  const [newReason, setNewReason] = useState('');
  const [filter, setFilter] = useState('all');

  const locale = i18n.language === 'de' ? de : enUS;

  const handleCreate = () => {
    if (!newReason.trim()) return;
    
    createMutation.mutate(
      { data: { type: newType, reason: newReason } },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewReason('');
          setNewType('time_off');
          queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
          toast({ title: 'Request submitted' });
        },
        onError: () => toast({ title: 'Failed to submit', variant: 'destructive' })
      }
    );
  };

  const handleUpdateStatus = (id: number, status: 'approved' | 'denied') => {
    updateMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: (data) => {
          // Optimistic update
          queryClient.setQueryData(getListRequestsQueryKey(), (old: any) => 
            old?.map((req: any) => req.id === id ? { ...req, status: data.status } : req)
          );
          toast({ title: `Request ${status}` });
        }
      }
    );
  };

  const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">{t('requests.status.approved')}</Badge>;
      case 'denied': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">{t('requests.status.denied')}</Badge>;
      default: return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">{t('requests.status.pending')}</Badge>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'time_off': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'equipment': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'remote_work': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('requests.title')}</h2>
          <p className="text-muted-foreground">Manage your workplace requests.</p>
        </div>
        {!isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                {t('requests.new')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('requests.createTitle')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('requests.type')}</label>
                  <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_off">{t('requests.types.time_off')}</SelectItem>
                      <SelectItem value="remote_work">{t('requests.types.remote_work')}</SelectItem>
                      <SelectItem value="equipment">{t('requests.types.equipment')}</SelectItem>
                      <SelectItem value="other">{t('requests.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('requests.reason')}</label>
                  <Textarea 
                    placeholder="Details about your request..." 
                    value={newReason} 
                    onChange={e => setNewReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('requests.cancel')}</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending || !newReason.trim()}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('requests.submit')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <TabsList className="bg-muted">
                <TabsTrigger value="all">{t('requests.all')}</TabsTrigger>
                <TabsTrigger value="pending">{t('requests.status.pending')}</TabsTrigger>
                <TabsTrigger value="approved">{t('requests.status.approved')}</TabsTrigger>
                <TabsTrigger value="denied">{t('requests.status.denied')}</TabsTrigger>
              </TabsList>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <CalendarRange className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-medium">{t('requests.empty')}</h3>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {isAdmin && <TableHead>{t('requests.employee')}</TableHead>}
                    <TableHead>{t('requests.type')}</TableHead>
                    <TableHead>{t('requests.reason')}</TableHead>
                    <TableHead>{t('requests.date')}</TableHead>
                    <TableHead>{t('requests.status.pending')}</TableHead>
                    {isAdmin && filter === 'pending' && <TableHead className="text-right">{t('requests.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req, i) => (
                    <TableRow key={req.id} className="group">
                      {isAdmin && <TableCell className="font-medium">{req.userName}</TableCell>}
                      <TableCell>
                        <Badge variant="outline" className={getTypeColor(req.type)}>
                          {t(`requests.types.${req.type}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">{req.reason}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(req.createdAt), 'PP', { locale })}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      {isAdmin && req.status === 'pending' && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateStatus(req.id, 'approved')}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => handleUpdateStatus(req.id, 'denied')}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {isAdmin && filter !== 'pending' && req.status === 'pending' && (
                        <TableCell className="text-right">
                           <div className="flex justify-end gap-2">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateStatus(req.id, 'approved')}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => handleUpdateStatus(req.id, 'denied')}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
