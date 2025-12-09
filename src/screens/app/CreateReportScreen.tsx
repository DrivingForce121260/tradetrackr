/**
 * Create Report Screen
 * Allows service technicians to create full project reports
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Layout from '../../components/Layout';
import PrimaryButton from '../../components/PrimaryButton';
import TextField from '../../components/TextField';
import GewerkPicker from '../../components/GewerkPicker';
import ComponentInput from '../../components/ComponentInput';
import LeistungInput from '../../components/LeistungInput';
import { getAllLookupFamilies, LookupFamily } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { createProjectReport, getAllProjects } from '../../services/api';
import { queueMutation } from '../../services/offlineQueue';
import { saveLocalReport, markReportSynced } from '../../services/reportStorage';
import { Project, ProjectReport, WorkLine } from '../../types';

export default function CreateReportScreen() {
  const session = useAuthStore((state) => state.session);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    customer: '',
    projectNumber: '',
    workLocation: '',
    workDate: new Date().toISOString().split('T')[0],
    totalHours: '8',
    workDescription: '',
    gewerk: '', // Moved from workLineForm - mandatory field
    activeprojectName: '',
    location: '',
  });

  const [workLines, setWorkLines] = useState<WorkLine[]>([]);
  const [showWorkLineForm, setShowWorkLineForm] = useState(false); // Only show after project selection
  const [editingWorkLineIndex, setEditingWorkLineIndex] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showGewerkPicker, setShowGewerkPicker] = useState(false);
  const [availableFamilies, setAvailableFamilies] = useState<LookupFamily[]>([]);
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedLocationType, setSelectedLocationType] = useState<string>('');
  const [locationDetails, setLocationDetails] = useState({
    designation: '', // For Büro or Zimmer
    floor: '', // Stockwerk
  });
  const [validationErrors, setValidationErrors] = useState({
    project: false,
    workLocation: false,
    gewerk: false,
  });
  const [workLineForm, setWorkLineForm] = useState({
    component: '', // Now mandatory
    workDone: '',
    quantity: '1',
    hours: '1',
    // text and zusatz removed - not required
  });

  // Typical work locations in commercial and private buildings (alphabetically sorted)
  const workLocations = [
    'Außenbereich',
    'Bad / WC',
    'Balkon / Terrasse',
    'Büro',
    'Dachboden',
    'Dusche',
    'Eingangsbereich',
    'Elektroraum',
    'Flur / Korridor',
    'Garage',
    'Garten',
    'Heizungsraum',
    'Keller',
    'Konferenzraum',
    'Küche',
    'Lager',
    'Parkplatz',
    'Schlafzimmer',
    'Sonstiges',
    'Technikraum',
    'Treppenhaus',
    'Werkstatt',
    'Wohnzimmer',
    'Zimmer',
  ];

  // Locations that require floor selection
  const locationsWithFloor = ['Büro', 'Zimmer', 'Konferenzraum', 'Wohnzimmer', 'Schlafzimmer', 'Bad / WC', 'Dusche', 'Küche'];

  // Locations that require designation
  const locationsWithDesignation = ['Büro', 'Zimmer'];

  useEffect(() => {
    loadProjects();
    loadLookupFamilies();
  }, []);

  const loadLookupFamilies = async () => {
    if (!session?.concernID) return;
    try {
      const families = await getAllLookupFamilies(session.concernID);
      setAvailableFamilies(families);
    } catch (error) {
      console.error('Failed to load lookup families:', error);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      setFormData(prev => ({
        ...prev,
        projectNumber: selectedProject.projectNumber || selectedProject.id,
        customer: selectedProject.customerName || prev.customer, // Keep existing if not available
        workLocation: selectedProject.workAddress || prev.workLocation, // Keep existing if not available
        activeprojectName: selectedProject.name,
        location: selectedProject.workAddress || prev.location,
        gewerk: prev.gewerk, // Keep existing gewerk
      }));
      
      // Don't automatically open work line form - user must click "+ Hinzufügen" button
      // This ensures both project AND workLocation are filled before form opens
      // Only close form if project is deselected
      if (!showWorkLineForm) {
        // Keep form closed - user must click "+ Hinzufügen" button
      }
    } else {
      // Hide work line form if no project selected
      setShowWorkLineForm(false);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const allProjects = await getAllProjects(session.concernID);
      console.log(`📊 Loaded ${allProjects.length} total projects`);
      
      // Filter: Only show projects where user is assigned
      // User is assigned if they are in assignedEmployees OR assignedUserIds
      const userAssignedProjects = allProjects.filter(project => {
        // Filter out internal projects
        if (project.status === 'internal') return false;
        
        // Check if user is in assignedEmployees or assignedUserIds
        const assignedEmployees = project.assignedEmployees || [];
        const assignedUserIds = project.assignedUserIds || [];
        
        const isAssigned = assignedEmployees.includes(session.userId) || 
                          assignedUserIds.includes(session.userId);
        
        // Debug logging
        if (isAssigned) {
          console.log(`✅ Project "${project.name}" assigned to user ${session.userId}`);
        }
        
        return isAssigned;
      });
      
      console.log(`📊 Found ${userAssignedProjects.length} projects assigned to user ${session.userId}`);
      console.log(`📊 User ID: ${session.userId}`);
      
      // If no assigned projects found, show all non-internal projects as fallback
      // This helps during development/testing when assignments might not be set up
      if (userAssignedProjects.length === 0) {
        console.warn('⚠️ No assigned projects found, showing all non-internal projects as fallback');
        const fallbackProjects = allProjects.filter(p => p.status !== 'internal');
        setProjects(fallbackProjects);
      } else {
        setProjects(userAssignedProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      Alert.alert('Fehler', 'Projekte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkLine = () => {
    // Validation: Component and Leistung are mandatory
    // Gewerk is now on main form, so we use formData.gewerk
    if (!workLineForm.component) {
      Alert.alert('Fehler', 'Bitte füllen Sie die Komponente aus');
      return;
    }
    if (!workLineForm.workDone) {
      Alert.alert('Fehler', 'Bitte füllen Sie die Leistung aus');
      return;
    }

    const newWorkLine: WorkLine = {
      linenumber: workLines.length + 1,
      reportID: '', // Will be set when report is created
      component: workLineForm.component,
      workDone: workLineForm.workDone,
      quantity: parseFloat(workLineForm.quantity) || 1,
      hours: parseFloat(workLineForm.hours) || 1,
      dateCreated: new Date().toISOString().split('T')[0],
      text: '', // Removed - not required
      zusatz: '', // Removed - not required
      activeProject: formData.projectNumber,
      location: formData.workLocation,
      UIDAB: session?.userId || '',
      mitarbeiterID: session?.userId || '',
      mitarbeiterName: session?.email || '',
      activeprojectName: formData.activeprojectName,
      gewerk: formData.gewerk, // Use from formData (main form)
    };

    if (editingWorkLineIndex !== null) {
      // Edit existing work line
      const updated = [...workLines];
      updated[editingWorkLineIndex] = { ...newWorkLine, linenumber: workLines[editingWorkLineIndex].linenumber };
      setWorkLines(updated);
      setEditingWorkLineIndex(null);
    } else {
      // Add new work line
      setWorkLines([...workLines, newWorkLine]);
    }

    // Reset form
    setWorkLineForm({
      component: '',
      workDone: '',
      quantity: '1',
      hours: '1',
      text: '',
      zusatz: '',
      gewerk: '',
    });
    setShowWorkLineForm(false);
  };

  const handleEditWorkLine = (index: number) => {
    const workLine = workLines[index];
    setWorkLineForm({
      component: workLine.component,
      workDone: workLine.workDone,
      quantity: workLine.quantity.toString(),
      hours: workLine.hours.toString(),
      // gewerk removed - now in formData
    });
    setEditingWorkLineIndex(index);
    setShowWorkLineForm(true);
  };

  const handleDeleteWorkLine = (index: number) => {
    Alert.alert(
      'Arbeitszeile löschen',
      'Möchten Sie diese Arbeitszeile wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            const updated = workLines.filter((_, i) => i !== index);
            // Re-number work lines
            updated.forEach((wl, i) => {
              wl.linenumber = i + 1;
            });
            setWorkLines(updated);
          },
        },
      ]
    );
  };

  const calculateTotalHours = () => {
    if (workLines.length > 0) {
      return workLines.reduce((sum, wl) => sum + wl.hours, 0).toFixed(2);
    }
    return formData.totalHours;
  };

  const handleSubmit = async () => {
    if (!session) return;

    // Validation
    if (!formData.customer || !formData.projectNumber || !formData.workLocation || !formData.workDescription) {
      Alert.alert('Fehler', 'Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (workLines.length === 0) {
      Alert.alert('Hinweis', 'Möchten Sie den Bericht ohne Arbeitszeilen erstellen?', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Ja, erstellen', onPress: () => createReport() },
      ]);
      return;
    }

    createReport();
  };

  const createReport = async () => {
    if (!session) return;

    setSaving(true);
    try {
      const totalHours = parseFloat(calculateTotalHours());
      const reportNumber = `RPT-${formData.projectNumber}-${Date.now().toString().slice(-4)}`;

      // Update work lines with report ID (will be set after creation)
      const updatedWorkLines = workLines.map((wl, index) => ({
        ...wl,
        linenumber: index + 1,
        reportID: reportNumber,
        activeProject: formData.projectNumber,
        location: formData.workLocation,
        mitarbeiterID: session.userId,
      }));

      const report: Omit<ProjectReport, 'id' | 'createdAt' | 'updatedAt'> = {
        reportNumber,
        employee: session.email || 'Unbekannt',
        customer: formData.customer || '',
        projectNumber: formData.projectNumber,
        workLocation: formData.workLocation || '',
        workDate: formData.workDate,
        totalHours,
        workDescription: '', // Removed - info is in work lines
        status: 'pending',
        mitarbeiterID: session.userId,
        projectReportNumber: reportNumber,
        reportDate: formData.workDate,
        concernID: session.concernID,
        workLines: updatedWorkLines,
        activeprojectName: formData.activeprojectName,
        location: formData.location,
        // stadt removed - replaced by gewerk
      };

      // Always save locally first
      const localReport = await saveLocalReport(report);

      try {
        const firestoreId = await createProjectReport(report);
        // Mark as synced
        await markReportSynced(localReport.localId, firestoreId);
        
        Alert.alert('Erfolg', 'Bericht erfolgreich erstellt!', [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                customer: '',
                projectNumber: '',
                workLocation: '',
                workDate: new Date().toISOString().split('T')[0],
                totalHours: '8',
                workDescription: '',
                stadt: '',
                activeprojectName: '',
                location: '',
              });
              setWorkLines([]);
              setSelectedProject(null);
            },
          },
        ]);
      } catch (error) {
        console.error('Failed to create report, queuing:', error);
        // Queue for offline sync
        await queueMutation({
          type: 'create_project_report',
          payload: report,
        });
        Alert.alert(
          'Gespeichert',
          'Bericht wurde lokal gespeichert und wird synchronisiert, sobald Sie online sind',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setFormData({
                  customer: '',
                  projectNumber: '',
                  workLocation: '',
                  workDate: new Date().toISOString().split('T')[0],
                  totalHours: '8',
                  workDescription: '',
                  stadt: '',
                  activeprojectName: '',
                  location: '',
                });
                setWorkLines([]);
                setSelectedProject(null);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to create report:', error);
      Alert.alert('Fehler', 'Bericht konnte nicht erstellt werden');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Lade Projekte...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Neuen Bericht erstellen</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Project Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projekt auswählen *</Text>
          <TouchableOpacity
            style={[
              styles.projectSelector,
              validationErrors.project && styles.projectSelectorError,
            ]}
            onPress={() => {
              if (projects.length === 0) {
                Alert.alert(
                  'Keine Projekte',
                  'Es wurden keine Projekte gefunden, die Ihnen zugewiesen sind. Bitte kontaktieren Sie Ihren Administrator, um Projekte zugewiesen zu bekommen.',
                  [{ text: 'OK' }]
                );
                return;
              }
              
              setShowProjectPicker(true);
            }}
          >
            <Text style={[
              selectedProject ? styles.projectSelectorText : styles.projectSelectorPlaceholder,
              validationErrors.project && styles.projectSelectorErrorText,
            ]}>
              {selectedProject
                ? `${selectedProject.projectNumber || selectedProject.id} - ${selectedProject.name}`
                : 'Projekt auswählen...'}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
          {validationErrors.project && (
            <Text style={styles.errorText}>Bitte wählen Sie ein Projekt aus</Text>
          )}
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grunddaten</Text>
          
          {/* Compact Grid Layout - Row 1 */}
          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <TextField
                label="Kunde"
                value={formData.customer}
                onChangeText={(text) => setFormData({ ...formData, customer: text })}
                placeholder="Kundenname (optional)"
              />
            </View>
            <View style={styles.compactField}>
              <TextField
                label="Projektnummer"
                value={formData.projectNumber}
                onChangeText={(text) => setFormData({ ...formData, projectNumber: text })}
                placeholder="PRJ-2024-001"
                editable={!selectedProject} // Disable if project selected
              />
            </View>
          </View>

          {/* Compact Grid Layout - Row 2 */}
          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <Text style={styles.label}>Arbeitsort *</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  validationErrors.workLocation && styles.datePickerButtonError,
                ]}
                onPress={() => {
                  setShowLocationPicker(true);
                  setValidationErrors(prev => ({ ...prev, workLocation: false }));
                }}
              >
                <Text style={[
                  formData.workLocation ? styles.datePickerText : styles.datePickerPlaceholder,
                  validationErrors.workLocation && styles.datePickerErrorText,
                ]}>
                  {formData.workLocation || 'Standort auswählen...'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
              {validationErrors.workLocation && (
                <Text style={styles.errorTextCompact}>Bitte wählen Sie einen Arbeitsort aus</Text>
              )}
            </View>
            <View style={styles.compactField}>
              <Text style={styles.label}>Gewerk *</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  validationErrors.gewerk && styles.datePickerButtonError,
                ]}
                onPress={() => {
                  if (!selectedProject) {
                    Alert.alert('Hinweis', 'Bitte wählen Sie zuerst ein Projekt aus');
                    return;
                  }
                  setShowGewerkPicker(true);
                  setValidationErrors(prev => ({ ...prev, gewerk: false }));
                }}
              >
                <Text style={[
                  formData.gewerk ? styles.datePickerText : styles.datePickerPlaceholder,
                  validationErrors.gewerk && styles.datePickerErrorText,
                ]}>
                  {formData.gewerk || 'Gewerk auswählen...'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
              {validationErrors.gewerk && (
                <Text style={styles.errorTextCompact}>Bitte wählen Sie ein Gewerk aus</Text>
              )}
            </View>
          </View>

          {/* Compact Grid Layout - Row 3 */}
          <View style={styles.compactRow}>
            <View style={styles.compactField}>
              <Text style={styles.label}>Arbeitsdatum *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {new Date(formData.workDate).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.chevron}>📅</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.compactField}>
              <TextField
                label="Gesamtstunden"
                value={calculateTotalHours()}
                editable={workLines.length === 0}
                onChangeText={(text) => setFormData({ ...formData, totalHours: text })}
                placeholder="8"
                keyboardType="numeric"
              />
              {workLines.length > 0 && (
                <Text style={styles.hintTextCompact}>
                  Auto berechnet
                </Text>
              )}
            </View>
          </View>

        </View>

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <Text style={styles.modalTitle}>Arbeitsort auswählen</Text>
              
              <ScrollView style={styles.datePickerScrollView}>
                {workLocations.map((location) => {
                  const isSelected = formData.workLocation.startsWith(location);
                  
                  return (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.dateOption,
                        isSelected && styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        if (location === 'Sonstiges') {
                          // For custom location, we'll use a TextField in the Location Details Modal
                          // Set the location type and open details modal
                          setSelectedLocationType('Sonstiges');
                          setLocationDetails({ designation: '', floor: '' });
                          setShowLocationPicker(false);
                          setShowLocationDetails(true);
                        } else if (locationsWithDesignation.includes(location) || locationsWithFloor.includes(location)) {
                          // Show details modal for locations that need additional info
                          setSelectedLocationType(location);
                          // Parse existing location details if available
                          const existingLocation = formData.workLocation;
                          if (existingLocation.startsWith(location)) {
                            const parts = existingLocation.replace(location + ':', '').split(',');
                            const designation = parts[0]?.trim() || '';
                            const floor = parts[1]?.trim() || '';
                            setLocationDetails({ designation, floor });
                          } else {
                            setLocationDetails({ designation: '', floor: '' });
                          }
                          setShowLocationPicker(false);
                          setShowLocationDetails(true);
                        } else {
                          setFormData({ ...formData, workLocation: location });
                          setValidationErrors(prev => ({ ...prev, workLocation: false }));
                          setShowLocationPicker(false);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.dateOptionText,
                          isSelected && styles.dateOptionTextSelected,
                        ]}
                      >
                        {location}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Abbrechen"
                  onPress={() => setShowLocationPicker(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* Location Details Modal (for Büro, Zimmer, etc.) */}
        {showLocationDetails && (
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <Text style={styles.modalTitle}>{selectedLocationType} - Details</Text>
              
              <ScrollView style={styles.datePickerScrollView}>
                {locationsWithDesignation.includes(selectedLocationType) && (
                  <View style={styles.detailInputContainer}>
                    <Text style={styles.detailLabel}>
                      {selectedLocationType === 'Büro' ? 'Büro-Bezeichnung' : 'Zimmer-Bezeichnung'} (optional)
                    </Text>
                    <TextField
                      value={locationDetails.designation}
                      onChangeText={(text) => setLocationDetails({ ...locationDetails, designation: text })}
                      placeholder={selectedLocationType === 'Büro' ? 'z.B. 101, Einkauf, etc.' : 'z.B. 205, etc.'}
                    />
                  </View>
                )}

                {locationsWithFloor.includes(selectedLocationType) && (
                  <View style={styles.detailInputContainer}>
                    <Text style={styles.detailLabel}>Stockwerk (optional)</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowFloorPicker(true)}
                    >
                      <Text style={locationDetails.floor ? styles.datePickerText : styles.datePickerPlaceholder}>
                        {locationDetails.floor || 'Stockwerk auswählen...'}
                      </Text>
                      <Text style={styles.chevron}>▼</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <PrimaryButton
                    title="Abbrechen"
                    onPress={() => {
                      setShowLocationDetails(false);
                      setSelectedLocationType('');
                      setLocationDetails({ designation: '', floor: '' });
                    }}
                    variant="secondary"
                    style={styles.modalButton}
                  />
                  <PrimaryButton
                    title="Übernehmen"
                    onPress={() => {
                      // Build location string with details
                      let locationString = selectedLocationType;
                      
                      if (locationDetails.designation) {
                        locationString += `: ${locationDetails.designation}`;
                      }
                      
                      if (locationDetails.floor) {
                        locationString += locationDetails.designation ? `, ${locationDetails.floor}` : `, ${locationDetails.floor}`;
                      }
                      
                      setFormData({ ...formData, workLocation: locationString });
                      setShowLocationDetails(false);
                      setSelectedLocationType('');
                      setLocationDetails({ designation: '', floor: '' });
                    }}
                    style={styles.modalButton}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Floor Picker Modal */}
        {showFloorPicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <Text style={styles.modalTitle}>Stockwerk auswählen</Text>
              
              <ScrollView style={styles.datePickerScrollView}>
                {['Erdgeschoss', '1. Stock', '2. Stock', '3. Stock', '4. Stock', '5. Stock', '6. Stock', '7. Stock', '8. Stock', '9. Stock', '10. Stock', 'Dachgeschoss', 'Keller', 'Untergeschoss'].map((floor) => {
                  const isSelected = locationDetails.floor === floor;
                  return (
                    <TouchableOpacity
                      key={floor}
                      style={[
                        styles.dateOption,
                        isSelected && styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        setLocationDetails({ ...locationDetails, floor });
                        setShowFloorPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dateOptionText,
                          isSelected && styles.dateOptionTextSelected,
                        ]}
                      >
                        {floor}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                
                <TouchableOpacity
                  style={styles.dateOption}
                  onPress={() => {
                    setLocationDetails({ ...locationDetails, floor: '' });
                    setShowFloorPicker(false);
                  }}
                >
                  <Text style={styles.dateOptionText}>Kein Stockwerk</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Abbrechen"
                  onPress={() => setShowFloorPicker(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* Project Picker Modal */}
        {showProjectPicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <Text style={styles.modalTitle}>Projekt auswählen</Text>
              <Text style={styles.modalSubtitle}>
                {projects.length} {projects.length === 1 ? 'Projekt verfügbar' : 'Projekte verfügbar'}
              </Text>
              
              <ScrollView style={styles.datePickerScrollView}>
                {projects.map((project) => {
                  const isSelected = selectedProject?.id === project.id;
                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.dateOption,
                        isSelected && styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedProject(project);
                        setValidationErrors(prev => ({ ...prev, project: false }));
                        setShowProjectPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dateOptionText,
                          isSelected && styles.dateOptionTextSelected,
                        ]}
                      >
                        {project.projectNumber || project.id} - {project.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Abbrechen"
                  onPress={() => setShowProjectPicker(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* Gewerk Picker Modal */}
        <GewerkPicker
          visible={showGewerkPicker}
          onClose={() => setShowGewerkPicker(false)}
          onSelect={(gewerk) => {
            // Set gewerk in formData (main form)
            setFormData({ ...formData, gewerk });
            setValidationErrors(prev => ({ ...prev, gewerk: false }));
            setShowGewerkPicker(false);
          }}
          projectNumber={selectedProject?.projectNumber || selectedProject?.id || null}
          concernID={session?.concernID || ''}
          selectedGewerk={formData.gewerk}
        />


        {/* Date Picker Modal */}
        {showDatePicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <Text style={styles.modalTitle}>Arbeitsdatum auswählen</Text>
              <Text style={styles.modalSubtitle}>
                Maximal 90 Tage zurück möglich
              </Text>
              
              <ScrollView style={styles.datePickerScrollView}>
                {(() => {
                  const dates: string[] = [];
                  const today = new Date();
                  
                  for (let i = 0; i <= 90; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    dates.push(date.toISOString().split('T')[0]);
                  }
                  
                  return dates.map((dateStr) => {
                    const date = new Date(dateStr);
                    const isToday = dateStr === today.toISOString().split('T')[0];
                    const isSelected = dateStr === formData.workDate;
                    
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[
                          styles.dateOption,
                          isSelected && styles.dateOptionSelected,
                        ]}
                        onPress={() => {
                          setFormData({ ...formData, workDate: dateStr });
                          setShowDatePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dateOptionText,
                            isSelected && styles.dateOptionTextSelected,
                            isToday && styles.dateOptionToday,
                          ]}
                        >
                          {date.toLocaleDateString('de-DE', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                          {isToday && ' (Heute)'}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Abbrechen"
                  onPress={() => setShowDatePicker(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* Work Lines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Arbeitszeilen</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                // Validate required fields - all three must be filled
                const hasProject = selectedProject !== null && selectedProject !== undefined && (selectedProject.id || selectedProject.projectNumber);
                const hasWorkLocation = formData.workLocation && formData.workLocation.trim().length > 0;
                const hasGewerk = formData.gewerk && formData.gewerk.trim().length > 0;

                // Check if ALL are required
                if (!hasProject || !hasWorkLocation || !hasGewerk) {
                  // Set validation errors
                  setValidationErrors({
                    project: !hasProject,
                    workLocation: !hasWorkLocation,
                    gewerk: !hasGewerk,
                  });

                  // Show alert
                  const missingFields = [];
                  if (!hasProject) missingFields.push('Projekt');
                  if (!hasWorkLocation) missingFields.push('Arbeitsort');
                  if (!hasGewerk) missingFields.push('Gewerk');
                  
                  Alert.alert(
                    'Pflichtfelder fehlen',
                    `Bitte füllen Sie folgende Pflichtfelder aus: ${missingFields.join(', ')}`,
                    [{ text: 'OK' }]
                  );
                  return; // IMPORTANT: Don't open form if validation fails
                }

                // Only proceed if ALL fields are filled
                // Clear validation errors if all fields are filled
                setValidationErrors({ project: false, workLocation: false, gewerk: false });

                // Open form
                setShowWorkLineForm(true);
                setEditingWorkLineIndex(null);
                setWorkLineForm({
                  component: '',
                  workDone: '',
                  quantity: '1',
                  hours: '1',
                });
              }}
            >
              <Text style={styles.addButtonText}>+ Hinzufügen</Text>
            </TouchableOpacity>
          </View>

          {workLines.length === 0 ? (
            <Text style={styles.emptyText}>Keine Arbeitszeilen hinzugefügt</Text>
          ) : (
            workLines.map((workLine, index) => (
              <View key={index} style={styles.workLineCard}>
                <View style={styles.workLineHeader}>
                  <Text style={styles.workLineNumber}>Zeile {workLine.linenumber}</Text>
                  <View style={styles.workLineActions}>
                    <TouchableOpacity
                      onPress={() => handleEditWorkLine(index)}
                      style={styles.actionButton}
                    >
                      <Text style={styles.actionButtonText}>Bearbeiten</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteWorkLine(index)}
                      style={[styles.actionButton, styles.deleteButton]}
                    >
                      <Text style={styles.actionButtonText}>Löschen</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.workLineText}>
                  <Text style={styles.bold}>Komponente:</Text> {workLine.component}
                </Text>
                <Text style={styles.workLineText}>
                  <Text style={styles.bold}>Leistung:</Text> {workLine.workDone}
                </Text>
                <Text style={styles.workLineText}>
                  <Text style={styles.bold}>Menge:</Text> {workLine.quantity} |{' '}
                  <Text style={styles.bold}>Stunden:</Text> {workLine.hours}
                </Text>
                {workLine.gewerk && (
                  <Text style={styles.workLineText}>
                    <Text style={styles.bold}>Gewerk:</Text> {workLine.gewerk}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Work Line Form Modal */}
        {showWorkLineForm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingWorkLineIndex !== null ? 'Arbeitszeile bearbeiten' : 'Neue Arbeitszeile'}
              </Text>

              <ScrollView style={styles.modalScrollView}>
                {/* Component Input - Multiple input methods */}
                <View style={styles.compactField}>
                  <Text style={styles.label}>Komponente *</Text>
                  <ComponentInput
                    value={workLineForm.component}
                    onChangeText={(text) => setWorkLineForm({ ...workLineForm, component: text })}
                    concernID={session?.concernID || ''}
                    projectNumber={selectedProject?.projectNumber || selectedProject?.id || null}
                    gewerk={formData.gewerk}
                    availableFamilies={availableFamilies}
                    placeholder="Komponente eingeben oder auswählen..."
                    required
                  />
                  {!formData.gewerk && (
                    <Text style={styles.hintTextCompact}>
                      Gewerk muss zuerst auf der Hauptseite ausgewählt werden
                    </Text>
                  )}
                </View>

                <View style={styles.compactField}>
                  <Text style={styles.label}>Leistung *</Text>
                  <LeistungInput
                    value={workLineForm.workDone}
                    onChangeText={(text) => setWorkLineForm({ ...workLineForm, workDone: text })}
                    concernID={session?.concernID || ''}
                    placeholder="Beschreibung der Leistung"
                    multiline
                    numberOfLines={2}
                    style={styles.textArea}
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <TextField
                      label="Menge"
                      value={workLineForm.quantity}
                      onChangeText={(text) => setWorkLineForm({ ...workLineForm, quantity: text })}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <TextField
                      label="Stunden"
                      value={workLineForm.hours}
                      onChangeText={(text) => setWorkLineForm({ ...workLineForm, hours: text })}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

              </ScrollView>

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Abbrechen"
                  onPress={() => {
                    setShowWorkLineForm(false);
                    setEditingWorkLineIndex(null);
                  }}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <PrimaryButton
                  title={editingWorkLineIndex !== null ? 'Speichern' : 'Hinzufügen'}
                  onPress={handleAddWorkLine}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.actions}>
          <PrimaryButton
            title={saving ? 'Wird gespeichert...' : 'Bericht erstellen'}
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8E8E93',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  compactField: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  datePickerButtonError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  datePickerErrorText: {
    color: '#FF3B30',
  },
  datePickerText: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
  },
  datePickerPlaceholder: {
    flex: 1,
    fontSize: 17,
    color: '#C7C7CC',
  },
  hintTextCompact: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: -8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 4,
    marginBottom: 8,
  },
  errorTextCompact: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 4,
    marginBottom: 8,
  },
  textAreaCompact: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  datePickerScrollView: {
    maxHeight: 300,
  },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  dateOptionSelected: {
    backgroundColor: '#007AFF',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  dateOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateOptionToday: {
    fontWeight: '600',
  },
  modalActions: {
    marginTop: 16,
  },
  modalButton: {
    marginTop: 8,
  },
  detailInputContainer: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  projectSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  projectSelectorText: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
  },
  projectSelectorPlaceholder: {
    flex: 1,
    fontSize: 17,
    color: '#C7C7CC',
  },
  projectSelectorErrorText: {
    color: '#FF3B30',
  },
  chevron: {
    fontSize: 12,
    color: '#8E8E93',
  },
  hintText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: -12,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  workLineCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  workLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workLineNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  workLineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E5E5EA',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  workLineText: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
  },
  actions: {
    marginTop: 16,
    marginBottom: 32,
  },
  familyButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  familyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#D1D1D6',
    marginRight: 8,
    marginBottom: 8,
  },
  familyButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  familyButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  familyButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectionDisplay: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectionDisplayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  selectionDisplayText: {
    fontSize: 13,
    color: '#000000',
  },
});

