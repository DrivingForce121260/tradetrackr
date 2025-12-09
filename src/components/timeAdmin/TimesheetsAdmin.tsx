/**
 * TradeTrackr - Timesheets Admin
 * View and manage time periods
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Users } from 'lucide-react';

export function TimesheetsAdmin({ concernId }: { concernId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stundenzettel</h1>
        <p className="text-gray-600 mt-2">Perioden ansehen und verwalten</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-16 w-16 mx-auto mb-4" />
            <p>Stundenzettel-Verwaltung</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
















