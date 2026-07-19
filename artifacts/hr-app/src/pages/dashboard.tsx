import React, { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { useGetEmployeeStats, useGetAdminStats } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { Clock, Users, CalendarCheck, CalendarDays, Activity } from 'lucide-react';

const COLORS = {
  approved: 'hsl(142 76% 36%)',
  denied: 'hsl(0 84% 60%)',
  pending: 'hsl(38 92% 50%)',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t('dashboard.goodMorning')}, {user?.name?.split(' ')[0] || 'there'}!
          </h2>
          <p className="text-muted-foreground">Here is what's happening today.</p>
        </div>
      </motion.div>

      {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, delay = 0 }: { title: string, value: string | number, icon: any, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmployeeDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useGetEmployeeStats();

  const chartData = useMemo(() => {
    if (!stats?.requestBreakdown) return [];
    return [
      { name: t('requests.status.approved'), value: stats.requestBreakdown.approved, color: COLORS.approved },
      { name: t('requests.status.pending'), value: stats.requestBreakdown.pending, color: COLORS.pending },
      { name: t('requests.status.denied'), value: stats.requestBreakdown.denied, color: COLORS.denied },
    ].filter(d => d.value > 0);
  }, [stats, t]);

  if (isLoading) return <div className="animate-pulse h-64 bg-card rounded-xl"></div>;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-full grid gap-6 md:grid-cols-2">
        <StatCard title={t('dashboard.hoursThisWeek')} value={`${stats?.weeklyHours.toFixed(1) || 0}h`} icon={Clock} delay={0.1} />
        <StatCard title={t('dashboard.avgDailyHours')} value={`${stats?.avgDailyHours.toFixed(1) || 0}h`} icon={Activity} delay={0.2} />
      </div>

      <motion.div 
        className="col-span-full lg:col-span-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="h-full border-none shadow-sm">
          <CardHeader>
            <CardTitle>{t('dashboard.requestBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                <CalendarDays className="h-8 w-8 opacity-20" />
                No requests found
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function AdminDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useGetAdminStats();

  const chartData = useMemo(() => {
    if (!stats?.requestBreakdown) return [];
    return [
      { name: t('requests.status.approved'), value: stats.requestBreakdown.approved, color: COLORS.approved },
      { name: t('requests.status.pending'), value: stats.requestBreakdown.pending, color: COLORS.pending },
      { name: t('requests.status.denied'), value: stats.requestBreakdown.denied, color: COLORS.denied },
    ].filter(d => d.value > 0);
  }, [stats, t]);

  if (isLoading) return <div className="animate-pulse h-64 bg-card rounded-xl"></div>;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title={t('dashboard.activeToday')} value={stats?.activeEmployeesToday || 0} icon={Users} delay={0.1} />
      <StatCard title={t('dashboard.totalEmployees')} value={stats?.totalEmployees || 0} icon={Users} delay={0.2} />
      <StatCard title={t('dashboard.avgOfficeHours')} value={`${stats?.avgOfficeHours.toFixed(1) || 0}h`} icon={Clock} delay={0.3} />
      <StatCard title={t('dashboard.pendingRequests')} value={stats?.pendingRequests || 0} icon={CalendarCheck} delay={0.4} />

      <motion.div 
        className="col-span-full md:col-span-2 lg:col-span-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-none shadow-sm h-full">
          <CardHeader>
            <CardTitle>Company Request Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <CalendarDays className="h-8 w-8 opacity-20" />
                No requests found
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
