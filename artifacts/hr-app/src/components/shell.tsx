import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { Menu, LayoutDashboard, Megaphone, CalendarRange, Clock, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUpdateUser } from '@workspace/api-client-react';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const updateUser = useUpdateUser();

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/announcements', icon: Megaphone, label: t('nav.announcements') },
    { href: '/requests', icon: CalendarRange, label: t('nav.requests') },
    { href: '/clock', icon: Clock, label: t('nav.clock') },
  ];

  const handleLanguageChange = (lang: 'en' | 'de') => {
    i18n.changeLanguage(lang);
    if (user) {
      updateUser.mutate({ id: user.id, data: { language: lang } });
    }
  };

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const currentTitle = navItems.find((item) => location.startsWith(item.href))?.label || 'HRFlow';

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground">
        <div className="font-bold text-lg tracking-tight">HRFlow</div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-sidebar-foreground">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col
      `}>
        <div className="p-6 hidden md:block">
          <div className="font-bold text-2xl tracking-tight text-sidebar-primary">HRFlow</div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 md:mt-0">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                <span className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer
                  ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}
                `}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors">
                <Avatar className="h-10 w-10 border border-sidebar-border">
                  <AvatarImage src={user?.profilePictureUrl || undefined} />
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
                    <UserIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-sidebar-foreground/70 capitalize truncate">{user?.role === 'admin' ? t('auth.admin') : t('auth.employee')}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <span className="text-sm">{t('auth.language')}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant={i18n.language === 'en' ? 'secondary' : 'ghost'} onClick={() => handleLanguageChange('en')} className="h-7 px-2 text-xs">EN</Button>
                  <Button size="sm" variant={i18n.language === 'de' ? 'secondary' : 'ghost'} onClick={() => handleLanguageChange('de')} className="h-7 px-2 text-xs">DE</Button>
                </div>
              </div>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('nav.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-card-border shrink-0">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{currentTitle}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-background p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
