/**
 * Firebase Cloud Functions for Authentication
 * Handles custom claims and user management
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Set custom claims for a user
 * This adds tenantId and role to the Firebase Auth token
 */
export const setUserCustomClaims = functions.https.onCall(async (data, context) => {
  // Check if request is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to set custom claims'
    );
  }

  const { userId, tenantId, role } = data;

  if (!userId || !tenantId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId and tenantId are required'
    );
  }

  try {
    // Set custom claims
    const customClaims: Record<string, any> = {
      tenantId,
    };

    if (role) {
      customClaims.role = role;
    }

    await admin.auth().setCustomUserClaims(userId, customClaims);

    functions.logger.info('Custom claims set successfully', {
      userId,
      tenantId,
      role,
    });

    return { success: true, message: 'Custom claims set successfully' };
  } catch (error) {
    functions.logger.error('Failed to set custom claims', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to set custom claims'
    );
  }
});

/**
 * Automatically set tenant custom claim when user is created
 * This triggers when a new user is added to Firebase Auth
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    // Get user document from Firestore
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(user.uid)
      .get();

    if (!userDoc.exists) {
      functions.logger.warn('User document not found in Firestore', {
        uid: user.uid,
      });
      return;
    }

    const userData = userDoc.data();
    const concernID = userData?.concernID;

    if (!concernID) {
      functions.logger.warn('User has no concernID', { uid: user.uid });
      return;
    }

    // Set custom claim with tenantId (concernID)
    await admin.auth().setCustomUserClaims(user.uid, {
      tenantId: concernID,
      role: userData?.role || 'user',
    });

    functions.logger.info('Tenant custom claim set automatically', {
      uid: user.uid,
      tenantId: concernID,
      role: userData?.role,
    });
  } catch (error) {
    functions.logger.error('Failed to set automatic tenant claim', error);
  }
});

/**
 * Migrate existing users to have custom claims
 * Admin-only function to set custom claims for all existing users
 */
export const migrateUserCustomClaims = functions.https.onCall(async (data, context) => {
  // Check if request is authenticated and user is admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in'
    );
  }

  // Check if user has admin role in custom claims
  if (context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can migrate user claims'
    );
  }

  try {
    // Get all users from Firestore
    const usersSnapshot = await admin.firestore().collection('users').get();

    const updates: Promise<void>[] = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const uid = doc.id;
      const concernID = userData.concernID;
      const role = userData.role || 'user';

      if (concernID) {
        updates.push(
          admin.auth().setCustomUserClaims(uid, {
            tenantId: concernID,
            role,
          })
        );
      }
    });

    await Promise.all(updates);

    functions.logger.info('User custom claims migrated', {
      count: updates.length,
    });

    return {
      success: true,
      message: `Successfully migrated ${updates.length} users`,
    };
  } catch (error) {
    functions.logger.error('Failed to migrate user claims', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to migrate user claims'
    );
  }
});







