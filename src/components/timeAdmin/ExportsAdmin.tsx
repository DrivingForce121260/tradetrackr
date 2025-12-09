/**
 * TradeTrackr - Exports Admin
 * Export timesheets as CSV/PDF/DATEV
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download, FileText, Table } from 'lucide-react';

export function ExportsAdmin({ concernId }: { concernId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exporte</h1>
        <p className="text-gray-600 mt-2">CSV, PDF und DATEV-Export</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-[#058bc0]" />
              <h3 className="font-semibold">CSV Export</h3>
              <Button className="w-full bg-[#058bc0]">
                <Download className="h-4 w-4 mr-2" />
                CSV Erstellen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-red-600" />
              <h3 className="font-semibold">PDF Export</h3>
              <Button className="w-full bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4 mr-2" />
                PDF Erstellen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Table className="h-12 w-12 mx-auto text-green-600" />
              <h3 className="font-semibold">DATEV Export</h3>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                DATEV Erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
















