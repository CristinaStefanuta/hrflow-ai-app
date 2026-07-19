import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { 
  useGetTimeStatus, 
  useGetWeeklySummary, 
  useGetShiftPlan, 
  useGetClockOverview,
  useCreateTimeEntry,
  getGetTimeStatusQueryKey,
  getGetClockOverviewQueryKey,
  getGetWeeklySummaryQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Play, Square, Pause, RotateCcw, Clock as ClockIcon, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

export default function Clock() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Time & Attendance</h2>
          <p className="text-muted-foreground">Track your hours and manage your schedule.</p>
        </div>
      </div>

      {isAdmin ? <AdminClockView /> : <EmployeeClockView />}
    </div>
  );
}

function EmployeeClockView() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, refetch: refetchStatus } = useGetTimeStatus();
  const { data: weekly } = useGetWeeklySummary();
  const { data: shiftPlan } = useGetShiftPlan();
  const createEntry = useCreateTimeEntry();

  // Auto-refresh clock status every 30s
  useEffect(() => {
    const interval = setInterval(() => refetchStatus(), 30000);
    return () => clearInterval(interval);
  }, [refetchStatus]);

  const handleAction = (type: 'clock_in' | 'clock_out' | 'pause_start' | 'pause_end') => {
    createEntry.mutate(
      { data: { type } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTimeStatusQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
        },
        onError: () => toast({ title: 'Failed to record entry', variant: 'destructive' })
      }
    );
  };

  const currentStatus = status?.status || 'not_started';
  const progressPercent = status ? Math.min(100, (status.workedMinutesToday / status.requiredMinutesPerDay) * 100) : 0;
  
  // Format hours and mins
  const hours = Math.floor((status?.workedMinutesToday || 0) / 60);
  const mins = (status?.workedMinutesToday || 0) % 60;

  const chartData = weekly?.days.map(d => ({
    name: format(parseISO(d.date), 'EEE'),
    hours: Number((d.workedMinutes / 60).toFixed(1))
  })) || [];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Tracker Card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-none shadow-sm h-full flex flex-col">
          <CardHeader className="text-center pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Status</CardTitle>
            <div className="mt-2 text-primary font-bold text-lg">
              {t(`clock.status.${currentStatus}` as any)}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" className="stroke-muted fill-none" strokeWidth="12" />
                <circle 
                  cx="96" cy="96" r="88" 
                  className="stroke-primary fill-none transition-all duration-1000 ease-out" 
                  strokeWidth="12"
                  strokeDasharray="553"
                  strokeDashoffset={553 - (553 * progressPercent) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <div className="text-4xl font-extrabold tabular-nums tracking-tight">{hours}h {mins}m</div>
                <div className="text-xs text-muted-foreground mt-1">/ 8h 0m req.</div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 w-full max-w-[200px]">
              {(currentStatus === 'not_started' || currentStatus === 'clocked_out') && (
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90" onClick={() => handleAction('clock_in')} disabled={createEntry.isPending}>
                  <Play className="mr-2 h-4 w-4 fill-current" /> {t('clock.startShift')}
                </Button>
              )}
              {currentStatus === 'clocked_in' && (
                <>
                  <Button size="lg" variant="outline" className="w-full text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleAction('pause_start')} disabled={createEntry.isPending}>
                    <Pause className="mr-2 h-4 w-4 fill-current" /> {t('clock.takeBreak')}
                  </Button>
                  <Button size="lg" variant="destructive" className="w-full" onClick={() => handleAction('clock_out')} disabled={createEntry.isPending}>
                    <Square className="mr-2 h-4 w-4 fill-current" /> {t('clock.endShift')}
                  </Button>
                </>
              )}
              {currentStatus === 'on_pause' && (
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90" onClick={() => handleAction('pause_end')} disabled={createEntry.isPending}>
                  <RotateCcw className="mr-2 h-4 w-4" /> {t('clock.resumeShift')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats & Schedule */}
      <div className="md:col-span-2 space-y-6 flex flex-col">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center"><Calendar className="mr-2 h-5 w-5 text-primary" /> {t('clock.weeklySummary')}</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours >= 8 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex-1">
          <Card className="border-none shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center"><ClockIcon className="mr-2 h-5 w-5 text-primary" /> {t('clock.shiftPlan')}</CardTitle>
            </CardHeader>
            <CardContent>
              {shiftPlan?.length ? (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftPlan.map((day) => (
                        <TableRow key={day.date} className={day.isToday ? "bg-primary/5 hover:bg-primary/5" : ""}>
                          <TableCell className={`font-medium ${day.isToday ? 'text-primary' : ''}`}>
                            {day.dayName}, {format(parseISO(day.date), 'MMM d')}
                          </TableCell>
                          <TableCell>{day.plannedStart}</TableCell>
                          <TableCell>{day.plannedEnd}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{t('clock.emptyPlan')}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function AdminClockView() {
  const { t } = useTranslation();
  const { data: overview, refetch } = useGetClockOverview();

  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clocked_in': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />Clocked In</Badge>;
      case 'on_pause': return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">On Break</Badge>;
      case 'not_started': return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Not Started</Badge>;
      case 'clocked_out': return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Clocked Out</Badge>;
      default: return null;
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          Live Attendance Board
        </CardTitle>
      </CardHeader>
      <CardContent>
        {overview?.length ? (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.map((emp) => (
                  <TableRow key={emp.userId}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.department || '—'}</TableCell>
                    <TableCell>{getStatusBadge(emp.status)}</TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {emp.clockedInAt ? format(parseISO(emp.clockedInAt), 'HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No employees found.</div>
        )}
      </CardContent>
    </Card>
  );
}
