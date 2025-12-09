/**
 * TradeTrackr - Sites & Geofence Admin
 * Manage work sites with geofence editor and map
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  QrCode,
  Ruler,
} from 'lucide-react';
import {
  getAllSites,
  createSite,
  updateSite,
  deleteSite,
  type Site,
} from '../../services/timeAdminService';

interface SitesGeofenceAdminProps {
  concernId: string;
}

export function SitesGeofenceAdmin({ concernId }: SitesGeofenceAdminProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Fetch sites
  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites', concernId],
    queryFn: () => getAllSites(concernId),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', concernId] });
      setIsEditing(false);
      setSelectedSite(null);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ siteId, data }: { siteId: string; data: Partial<Site> }) =>
      updateSite(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', concernId] });
      setIsEditing(false);
      setSelectedSite(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', concernId] });
    },
  });

  const handleCreateNew = () => {
    setSelectedSite({
      siteId: '',
      name: '',
      geo: { lat: 52.520008, lng: 13.404954 }, // Berlin default
      radiusMeters: 100,
      projectIds: [],
      concernId,
      active: true,
    });
    setIsEditing(true);
  };

  const handleEdit = (site: Site) => {
    setSelectedSite(site);
    setIsEditing(true);
  };

  const handleDelete = async (siteId: string) => {
    if (confirm('Baustelle wirklich löschen?')) {
      await deleteMutation.mutateAsync(siteId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Baustellen & Geofences</h1>
          <p className="text-gray-600 mt-2">
            Verwalten Sie Arbeitsorte mit GPS-Geofencing
          </p>
        </div>
        <Button onClick={handleCreateNew} className="bg-[#058bc0] hover:bg-[#047aa0]">
          <Plus className="h-4 w-4 mr-2" />
          Neue Baustelle
        </Button>
      </div>

      {/* Sites List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">Lädt...</div>
        ) : !sites || sites.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Keine Baustellen vorhanden. Erstellen Sie die erste!
          </div>
        ) : (
          sites.map((site) => (
            <SiteCard
              key={site.siteId}
              site={site}
              onEdit={() => handleEdit(site)}
              onDelete={() => handleDelete(site.siteId)}
            />
          ))
        )}
      </div>

      {/* Editor Modal/Panel */}
      {isEditing && selectedSite && (
        <SiteEditor
          site={selectedSite}
          onSave={async (data) => {
            if (data.siteId) {
              await updateMutation.mutateAsync({
                siteId: data.siteId,
                data,
              });
            } else {
              await createMutation.mutateAsync(data);
            }
          }}
          onCancel={() => {
            setIsEditing(false);
            setSelectedSite(null);
          }}
        />
      )}
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

interface SiteCardProps {
  site: Site;
  onEdit: () => void;
  onDelete: () => void;
}

function SiteCard({ site, onEdit, onDelete }: SiteCardProps) {
  return (
    <Card className={!site.active ? 'opacity-50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#058bc0]" />
            {site.name}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>
              {site.geo.lat.toFixed(6)}, {site.geo.lng.toFixed(6)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Ruler className="h-4 w-4" />
            <span>Radius: {site.radiusMeters}m</span>
          </div>
          {site.qrCode && (
            <div className="flex items-center gap-2 text-gray-600">
              <QrCode className="h-4 w-4" />
              <span>QR-Code: {site.qrCode}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{site.projectIds.length} Projekte</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SiteEditorProps {
  site: Site;
  onSave: (site: Omit<Site, 'siteId'>) => Promise<void>;
  onCancel: () => void;
}

function SiteEditor({ site, onSave, onCancel }: SiteEditorProps) {
  const [formData, setFormData] = useState(site);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
      alert('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="fixed inset-4 md:inset-auto md:top-20 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50 overflow-auto max-h-[90vh]">
      <CardHeader className="border-b">
        <CardTitle>
          {site.siteId ? 'Baustelle bearbeiten' : 'Neue Baustelle'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="z.B. Baustelle Nord"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="0.000001"
                value={formData.geo.lat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    geo: { ...formData.geo, lat: parseFloat(e.target.value) },
                  })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="0.000001"
                value={formData.geo.lng}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    geo: { ...formData.geo, lng: parseFloat(e.target.value) },
                  })
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="radius">Geofence-Radius (Meter)</Label>
            <Input
              id="radius"
              type="number"
              min="10"
              max="1000"
              value={formData.radiusMeters}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  radiusMeters: parseInt(e.target.value),
                })
              }
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Empfohlen: 100-200m
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#058bc0] hover:bg-[#047aa0]"
            >
              {isSaving ? 'Speichert...' : 'Speichern'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
















