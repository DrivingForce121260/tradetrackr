/**
 * TradeTrackr - Approvals Admin
 * Unified approval queue for punches, timesheets, and leave
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { CheckCircle, XCircle, Clock, Calendar, Plane } from 'lucide-react';

export function ApprovalsAdmin({ concernId }: { concernId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Genehmigungen</h1>
        <p className="text-gray-600 mt-2">
          Stundenzettel, Anträge und Korrekturen genehmigen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#058bc0]" />
            Ausstehende Genehmigungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>Keine ausstehenden Genehmigungen</p>
            <p className="text-sm mt-2">Einreichte Stundenzettel erscheinen hier</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
















