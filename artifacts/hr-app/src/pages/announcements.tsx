import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { 
  useListAnnouncements, 
  useCreateAnnouncement, 
  useDeleteAnnouncement,
  getListAnnouncementsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Plus, Trash2, Megaphone, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Announcements() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data: announcements = [], isLoading } = useListAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const locale = i18n.language === 'de' ? de : enUS;

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    createMutation.mutate(
      { data: { title: newTitle, content: newContent } },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewTitle('');
          setNewContent('');
          queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
          toast({ title: 'Announcement posted' });
        },
        onError: () => toast({ title: 'Failed to post', variant: 'destructive' })
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm(t('announcements.deleteConfirm'))) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
          toast({ title: 'Announcement deleted' });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('announcements.title')}</h2>
          <p className="text-muted-foreground">Stay up to date with company news.</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                {t('announcements.new')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{t('announcements.createTitle')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Input 
                    placeholder={t('announcements.announcementTitle')} 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)}
                    className="font-medium text-lg"
                  />
                </div>
                <div className="grid gap-2">
                  <div 
                    className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    contentEditable
                    data-placeholder={t('announcements.content')}
                    onInput={(e) => setNewContent(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: newContent }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('announcements.cancel')}</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending || !newTitle.trim() || !newContent.trim()}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('announcements.post')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="animate-pulse h-32 bg-card rounded-xl border border-card-border" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Megaphone className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-lg font-medium">{t('announcements.empty')}</h3>
          <p className="text-muted-foreground mt-1">Check back later for updates.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map((ann, i) => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-card-border shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-primary">{ann.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Posted by <span className="font-medium">{ann.authorName}</span> • {format(new Date(ann.createdAt), 'PPp', { locale })}
                      </p>
                    </div>
                    {isAdmin && ann.authorId === user?.id && (
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(ann.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 prose prose-sm max-w-none prose-blue">
                  <div dangerouslySetInnerHTML={{ __html: ann.content }} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
