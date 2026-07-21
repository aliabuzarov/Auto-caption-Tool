import React, { useEffect, useState } from 'react';
import { getJobs, JobListResponse, deleteProject, updateProject, mediaUrl } from '../api';
import { Video, Plus, Clock, Play, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface DashboardProps {
  onSelectProject: (jobId: string) => void;
  onCreateNewProject: () => void;
}

export default function Dashboard({ onSelectProject, onCreateNewProject }: DashboardProps) {
  const [projects, setProjects] = useState<JobListResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const jobs = await getJobs();
        setProjects(jobs);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const getProjectName = (project: JobListResponse) => {
    if (project.name && project.name !== "Untitled Project") return project.name;
    if (!project.input_video) return 'Untitled Project';
    const parts = project.input_video.split('/');
    return parts[parts.length - 1] || 'Untitled Project';
  };

  const handleRename = async (jobId: string, newName: string) => {
    try {
      await updateProject(jobId, newName);
      setProjects((prev) => prev.map((p) => p.id === jobId ? { ...p, name: newName } : p));
    } catch (e) {
      console.error('Failed to rename:', e);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(jobId);
      setProjects((prev) => prev.filter((p) => p.id !== jobId));
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto bg-background p-8">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-wide">Project History</h1>
            <p className="text-on-surface-variant/70 text-sm mt-1">Manage and resume your recent video projects</p>
          </div>
          <button
            onClick={onCreateNewProject}
            className="px-6 py-2.5 bg-primary text-background-dark font-bold rounded-xl flex items-center gap-2 hover:bg-white hover:scale-105 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-on-surface-variant font-medium">Loading history...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-surface rounded-2xl border border-white/[0.04]">
            <Video className="w-12 h-12 text-on-surface-variant/30 mb-4" />
            <h2 className="text-lg font-semibold text-on-surface">No Projects Yet</h2>
            <p className="text-on-surface-variant/70 mb-6 text-sm">Create your first video captioning project</p>
            <button
              onClick={onCreateNewProject}
              className="px-6 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-all cursor-pointer"
            >
              Start Creating
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group flex flex-col bg-surface rounded-2xl border border-white/[0.04] overflow-hidden hover:border-primary/40 hover:shadow-[0_8px_32px_rgba(173,198,255,0.05)] transition-all cursor-pointer"
              >
                <div className="aspect-video bg-neutral-950 relative flex items-center justify-center overflow-hidden">
                  {project.thumbnail ? (
                    <img src={mediaUrl(project.thumbnail)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Thumbnail" />
                  ) : (
                    <Video className="w-10 h-10 text-white/[0.05] group-hover:scale-110 transition-transform duration-500" />
                  )}
                  
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${
                      project.status === 'done' ? 'bg-secondary' :
                      project.status === 'failed' ? 'bg-error' :
                      project.status === 'ready_for_review' ? 'bg-tertiary' :
                      'bg-primary animate-pulse'
                    }`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                      {project.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm border border-primary/30">
                      <Play className="w-5 h-5 text-primary ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2 relative">
                  {editingProjectId === project.id ? (
                    <input
                      autoFocus
                      className="bg-black/50 border border-primary/50 rounded px-2 py-1 text-on-surface font-bold text-sm w-full outline-none"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => {
                        handleRename(project.id, editingName);
                        setEditingProjectId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRename(project.id, editingName);
                          setEditingProjectId(null);
                        } else if (e.key === 'Escape') {
                          setEditingProjectId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-on-surface truncate pr-6">
                        {getProjectName(project)}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === project.id ? null : project.id);
                        }}
                        className="text-on-surface-variant hover:text-white p-1 rounded-full hover:bg-white/10 absolute right-3 top-3 z-10"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {activeMenuId === project.id && (
                        <div className="absolute right-3 top-10 w-36 bg-surface-container-high border border-white/10 rounded-lg shadow-xl overflow-hidden z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingName(getProjectName(project));
                              setEditingProjectId(project.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-white/5 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(project.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center text-[11px] text-on-surface-variant/70 font-medium">
                    <Clock className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                    {formatDate(project.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
