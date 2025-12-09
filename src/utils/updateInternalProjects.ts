import { projectService } from '@/services/firestoreService';
import { generateInternalProjectNumber } from './projectNumberGenerator';
import { ExtendedProject } from '@/types/project';

/**
 * Updates project numbers for all internal projects in a concern
 * Format: concernID + 3-letter abbreviation of project name
 */
export async function updateInternalProjectNumbers(
  concernID: string,
  projects: ExtendedProject[]
): Promise<{ updated: number; errors: number }> {
  const internalProjects = projects.filter(
    (project) =>
      project.isInternal === true ||
      (project as any).internalCategory !== undefined ||
      project.category?.toLowerCase() === 'internal' ||
      project.category?.toLowerCase() === 'intern'
  );

  let updated = 0;
  let errors = 0;

  for (const project of internalProjects) {
    try {
      if (!project.name || !project.id) {
        console.warn(`⚠️ Skipping project without name or ID:`, project);
        continue;
      }

      const newProjectNumber = generateInternalProjectNumber(concernID, project.name);

      // Only update if the project number is different
      if (project.projectNumber !== newProjectNumber) {
        // Only update projectNumber, preserve all other fields including createdAt
        await projectService.update(project.id, {
          projectNumber: newProjectNumber,
        } as any);

        console.log(
          `✅ Updated project "${project.name}": ${project.projectNumber} → ${newProjectNumber}`
        );
        updated++;
      } else {
        console.log(`ℹ️ Project "${project.name}" already has correct number: ${newProjectNumber}`);
      }
    } catch (error) {
      console.error(`❌ Error updating project "${project.name}":`, error);
      errors++;
    }
  }

  return { updated, errors };
}




