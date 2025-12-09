/**
 * TradeTrackr - Benutzerdetails Dialog (Gepeppt)
 */

import React, { useState, useEffect, useRef } from 'react';
import LazyImage from './ui/LazyImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Building, MapPin, Calendar, Shield, Key, X, Camera, Upload, Trash2 } from 'lucide-react';
import { userService, concernService } from '@/services/firestoreService';
import { User as FirestoreUser, Concern } from '@/services/firestoreService';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function UserDetailsDialog({ open, onOpenChange, user }: UserDetailsDialogProps) {
  const [currentUserData, setCurrentUserData] = useState<FirestoreUser | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [concernData, setConcernData] = useState<Concern | null>(null);
  const [isLoadingConcernData, setIsLoadingConcernData] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadCurrentUserData = async () => {
      if (!user?.uid || !open) return;
      
      try {
        setIsLoadingUserData(true);
        const firestoreUser = await userService.get(user.uid);
        setCurrentUserData(firestoreUser || null);
      } catch (error) {
        setCurrentUserData(null);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadCurrentUserData();
  }, [user?.uid, open]);

  useEffect(() => {
    const loadConcernData = async () => {
      if (!user?.concernID || !open) return;
      
      try {
        setIsLoadingConcernData(true);
        const concern = await concernService.get(user.concernID);
        setConcernData(concern || null);
      } catch (error) {
        setConcernData(null);
      } finally {
        setIsLoadingConcernData(false);
      }
    };

    loadConcernData();
  }, [user?.concernID, open]);

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'Benutzer',
      field_worker: 'Außendienst-Mitarbeiter',
      auftraggeber: 'Auftraggeber',
      employee: 'Mitarbeiter',
      office: 'Büro-Mitarbeiter',
      project_manager: 'Projektleiter',
      service_technician: 'Servicetechniker'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Nicht angegeben';
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString('de-DE');
      }
      return new Date(date).toLocaleDateString('de-DE');
    } catch {
      return String(date);
    }
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return 'Nicht angegeben';
    try {
      if (date instanceof Date) {
        return date.toLocaleString('de-DE');
      }
      return new Date(date).toLocaleString('de-DE');
    } catch {
      return String(date);
    }
  };

  const getPermissionLevel = (rechte: number) => {
    if (rechte >= 10) return { level: 'Vollzugriff', color: 'bg-gradient-to-r from-red-500 to-red-600 text-white' };
    if (rechte >= 7) return { level: 'Erweiterte Rechte', color: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' };
    if (rechte >= 5) return { level: 'Standardrechte', color: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' };
    if (rechte >= 3) return { level: 'Eingeschränkte Rechte', color: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' };
    return { level: 'Minimale Rechte', color: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white' };
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
    if (role === 'office' || role === 'project_manager') return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
    if (role === 'service_technician') return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
    return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ungültiger Dateityp',
        description: 'Bitte wählen Sie eine Bilddatei (JPG, PNG, GIF, WebP)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Datei zu groß',
        description: 'Bitte wählen Sie ein Bild kleiner als 5MB',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // Create a preview and get base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          setPhotoPreview(result);
          resolve(result);
        };
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      let downloadURL = base64Data;

      // Try to upload to Firebase Storage, fallback to base64 if it fails
      try {
        console.log('📤 Uploading to Firebase Storage...');
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `user_photos/${user.uid}/${fileName}`);
        
        console.log('📤 Storage path:', `user_photos/${user.uid}/${fileName}`);
        
        await uploadBytes(storageRef, file, {
          contentType: file.type,
          customMetadata: {
            uploadedBy: user.uid,
            uploadedAt: new Date().toISOString()
          }
        });
        
        downloadURL = await getDownloadURL(storageRef);
        console.log('✅ Firebase Storage upload successful:', downloadURL);
      } catch (storageError: any) {
        console.warn('⚠️ Firebase Storage upload failed, using base64 fallback:', storageError);
        console.warn('Storage error details:', {
          code: storageError?.code,
          message: storageError?.message
        });
        // Use base64 as fallback
        downloadURL = base64Data;
        
        toast({
          title: 'Hinweis',
          description: 'Foto wird als Base64 gespeichert (Storage-Upload fehlgeschlagen)',
        });
      }

      // Update user document
      console.log('💾 Updating user document with photoURL...');
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
        photoUrl: downloadURL, // Support both fields for compatibility
        updatedAt: new Date()
      });

      // Update local state
      if (currentUserData) {
        setCurrentUserData({ ...currentUserData, photoURL: downloadURL, photoUrl: downloadURL });
      }

      toast({
        title: 'Foto hochgeladen',
        description: 'Ihr Profilfoto wurde erfolgreich aktualisiert',
      });

      // Reload to update header
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Photo upload error:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        serverResponse: error?.serverResponse
      });
      toast({
        title: 'Upload fehlgeschlagen',
        description: error?.message || 'Fehler beim Hochladen des Fotos',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!user?.uid) return;

    try {
      setIsUploadingPhoto(true);

      // Delete from Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: '',
        photoUrl: '',
        updatedAt: new Date()
      });

      // Update local state
      if (currentUserData) {
        setCurrentUserData({ ...currentUserData, photoURL: '', photoUrl: '' });
      }
      setPhotoPreview(null);

      toast({
        title: 'Foto gelöscht',
        description: 'Ihr Profilfoto wurde entfernt',
      });

      // Reload to update header
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Photo delete error:', error);
      toast({
        title: 'Löschen fehlgeschlagen',
        description: 'Fehler beim Löschen des Fotos',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4 shadow-lg sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            {/* User Photo */}
            <div className="relative group">
              {photoPreview || currentUserData?.photoURL || currentUserData?.photoUrl || user?.photoURL || user?.photoUrl ? (
                <div className="relative">
                  <LazyImage 
                    src={photoPreview || currentUserData?.photoURL || currentUserData?.photoUrl || user?.photoURL || user?.photoUrl || ''} 
                    alt="Profilfoto"
                    className="w-16 h-16 rounded-full border-4 border-white/30 object-cover shadow-lg"
                  />
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-6 h-6 p-0 rounded-full bg-white text-[#058bc0] hover:bg-blue-50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isUploadingPhoto}
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-6 h-6 p-0 rounded-full bg-white text-[#058bc0] hover:bg-blue-50 shadow-lg"
                    disabled={isUploadingPhoto}
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {isUploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                👤 Benutzerdetails
              </div>
              <div className="text-sm font-normal text-white/90 mt-1">
                {currentUserData ? `${currentUserData.vorname} ${currentUserData.nachname}` : `${user?.vorname} ${user?.nachname}`}
              </div>
              <div className="text-xs text-white/70 mt-1 flex items-center gap-2">
                <Camera className="h-3 w-3" />
                Klicken Sie auf das Foto, um es zu ändern
              </div>
            </div>
            
            {/* Delete Photo Button */}
            {(currentUserData?.photoURL || currentUserData?.photoUrl || user?.photoURL || user?.photoUrl) && (
              <Button
                size="sm"
                onClick={handlePhotoDelete}
                className="bg-red-500/20 hover:bg-red-500/40 text-white border-2 border-red-300 hover:border-red-200 transition-all hover:scale-105"
                disabled={isUploadingPhoto}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Foto löschen
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-6 pb-8">
          {/* Basic Information */}
          <Card className="border-2 border-blue-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                <span className="text-2xl">👤</span>
                Persönliche Informationen
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-br from-blue-50 to-white p-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <span>📝</span> Vorname
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  {currentUserData?.vorname || user?.vorname || 'Nicht angegeben'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <span>📝</span> Nachname
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  {currentUserData?.nachname || user?.nachname || 'Nicht angegeben'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> E-Mail
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm break-all">
                  {currentUserData?.email || user?.email || 'Nicht angegeben'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefon
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  {currentUserData?.tel || user?.tel || 'Nicht angegeben'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <span>🎂</span> Geburtsdatum
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  {formatDate(currentUserData?.dateOfBirth || user?.dateOfBirth)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Startdatum
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  {formatDate(currentUserData?.startDate || user?.startDate)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <span>💬</span> Display Name
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  {currentUserData?.displayName || user?.displayName || 'Nicht gesetzt'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Adresse
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm">
                  {currentUserData?.address || user?.address || 'Nicht angegeben'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Role and Permissions */}
          <Card className="border-2 border-purple-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                <Shield className="h-5 w-5" />
                Rolle & Berechtigungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 bg-gradient-to-br from-purple-50 to-white p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Rolle</label>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getRoleColor(currentUserData?.role || user?.role || '')} text-sm px-3 py-1 shadow-md`}>
                      {getRoleDisplayName(currentUserData?.role || user?.role || '')}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Berechtigungsstufe</label>
                  <div className="flex items-center gap-2">
                    {(currentUserData?.rechte !== undefined || user?.rechte !== undefined) && (
                      <Badge className={`${getPermissionLevel(currentUserData?.rechte || user?.rechte || 0).color} px-3 py-1 shadow-md`}>
                        {currentUserData?.rechte || user?.rechte || 0} - {getPermissionLevel(currentUserData?.rechte || user?.rechte || 0).level}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <span>🔢</span> Mitarbeiter-ID
                  </label>
                  <p className="text-gray-900 font-mono font-bold bg-white px-3 py-2 rounded-lg border-2 border-purple-200 shadow-sm">
                    {currentUserData?.mitarbeiterID || user?.mitarbeiterID || 'Nicht verfügbar'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Key className="h-3 w-3" /> Pass-PIN
                  </label>
                  <p className="text-gray-900 font-mono font-bold bg-white px-3 py-2 rounded-lg border-2 border-purple-200 shadow-sm">
                    {currentUserData?.passpin || user?.passpin || 'Nicht gesetzt'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Konto Status</label>
                <div>
                  {(currentUserData?.isActive !== undefined ? currentUserData.isActive : user?.isActive) ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 shadow-md">✅ Aktiv</Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 shadow-md">❌ Inaktiv</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card className="border-2 border-orange-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                <Building className="h-5 w-5" />
                Unternehmensinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 bg-gradient-to-br from-orange-50 to-white p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <span>🏢</span> Unternehmensname
                  </label>
                  <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-orange-200 shadow-sm">
                    {concernData ? concernData.concernName : (isLoadingConcernData ? '⏳ Lade...' : 'Nicht verfügbar')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Unternehmens-E-Mail
                  </label>
                  <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-orange-200 shadow-sm break-all">
                    {concernData ? concernData.concernEmail : (isLoadingConcernData ? '⏳ Lade...' : 'Nicht verfügbar')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Unternehmens-Telefon
                  </label>
                  <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-orange-200 shadow-sm">
                    {concernData ? concernData.concernTel : (isLoadingConcernData ? '⏳ Lade...' : 'Nicht verfügbar')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Unternehmens-Adresse
                  </label>
                  <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-orange-200 shadow-sm">
                    {concernData ? concernData.concernAddress : (isLoadingConcernData ? '⏳ Lade...' : 'Nicht verfügbar')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="border-2 border-cyan-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-6 py-4">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                <Calendar className="h-5 w-5" />
                Kontoinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-br from-cyan-50 to-white p-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <span>📅</span> Erstellt am
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-cyan-200 shadow-sm">
                  {formatDateTime(currentUserData?.dateCreated || user?.dateCreated)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <span>🔄</span> Letzte Aktivität
                </label>
                <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-cyan-200 shadow-sm">
                  {formatDateTime(currentUserData?.lastSync || user?.lastSync)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">E-Mail Status</label>
                <div>
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 shadow-md">✅ Aktiv</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Authentifizierung</label>
                <div>
                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 shadow-md">🔐 Firebase Auth</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Information */}
          <Card className="border-2 border-green-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4">
              <CardTitle className="text-lg flex items-center gap-2 font-bold">
                <Key className="h-5 w-5" />
                Verifizierungsinformationen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 bg-gradient-to-br from-green-50 to-white p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Code gesendet</label>
                  <div>
                    {(currentUserData?.verificationCodeSent !== undefined ? currentUserData.verificationCodeSent : user?.verificationCodeSent) ? (
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 shadow-md">✅ Ja</Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-1 shadow-md">❌ Nein</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <span>🔑</span> Verifizierungscode
                  </label>
                  <p className="text-gray-900 font-mono font-bold bg-white px-3 py-2 rounded-lg border-2 border-green-200 shadow-sm">
                    {currentUserData?.verificationCode || user?.verificationCode || 'Nicht gesetzt'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <span>📅</span> Code gesendet am
                  </label>
                  <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-green-200 shadow-sm">
                    {currentUserData?.verificationCodeSentAt || user?.verificationCodeSentAt || 'Nicht gesendet'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <span>⏰</span> Code gültig bis
                  </label>
                  <p className="text-gray-900 font-medium bg-white px-3 py-2 rounded-lg border-2 border-green-200 shadow-sm">
                    {currentUserData?.verificationCodeDate ? formatDate(currentUserData.verificationCodeDate) : (user?.verificationCodeDate ? formatDate(user.verificationCodeDate) : 'Nicht gesetzt')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end px-6 py-4 border-t-2 border-gray-300 bg-white sticky bottom-0 z-10 shadow-lg">
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white hover:from-[#0470a0] hover:to-[#046a90] font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <X className="h-4 w-4 mr-2" />
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

