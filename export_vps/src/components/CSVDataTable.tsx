import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database } from 'lucide-react';

interface CSVDataTableProps {
  reportData: string;
  reportDate?: string | Date;
  workDate?: string | Date;
  onValuesExtracted?: (standort: string, gewerk: string) => void;
  onShowRawData?: () => void;
}

export const CSVDataTable: React.FC<CSVDataTableProps> = ({
  reportData,
  reportDate,
  workDate,
  onValuesExtracted,
  onShowRawData
}) => {
  const csvData = useMemo(() => {
    try {
      // Sicherheitscheck für reportData
      if (!reportData || typeof reportData !== 'string') {

        return null;
      }
      
      const csvLines = reportData.split('\n').filter(line => line.trim());
      if (csvLines.length === 0) {
        return null;
      }
      

      
      // Parse CSV data
      const parsedData = csvLines.map((line, index) => {
        try {
          const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
          return { lineNumber: index + 1, columns };
        } catch (parseError) {

          return { lineNumber: index + 1, columns: [line] };
        }
      });
      
      // Verbesserte Header-Erkennung
      const headerLine = parsedData.find(row => 
        row.columns.some(col => {
          const colLower = col.toLowerCase();
          return colLower.includes('projectinfo') || 
                 colLower.includes('component') || 
                 colLower.includes('zeile') ||
                 colLower.includes('linie') ||
                 colLower.includes('arbeit') ||
                 colLower.includes('menge') ||
                 colLower.includes('stunden') ||
                 colLower.includes('datum') ||
                 colLower.includes('mitarbeiter') ||
                 colLower.includes('kunde') ||
                 colLower.includes('projekt') ||
                 colLower.includes('standort') ||
                 colLower.includes('gewerk') ||
                 colLower.includes('beschreibung');
        })
      );
      
      if (headerLine) {
        // öbersetze und bereinige Header
        const headers = headerLine.columns.map(header => {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('projectinfo')) return 'Projektinfo';
          if (headerLower.includes('component')) return 'Komponente';
          if (headerLower.includes('zeile') || headerLower.includes('linie')) return 'Zeile';
          if (headerLower.includes('arbeit')) return 'Arbeit';
          if (headerLower.includes('menge')) return 'Menge';
          if (headerLower.includes('stunden')) return 'Stunden';
          if (headerLower.includes('datum')) return 'Datum';
          if (headerLower.includes('mitarbeiter')) return 'Mitarbeiter';
          if (headerLower.includes('kunde')) return 'Kunde';
          if (headerLower.includes('projekt')) return 'Projekt';
          if (headerLower.includes('standort')) return 'Standort';
          if (headerLower.includes('gewerk')) return 'Gewerk';
          if (headerLower.includes('beschreibung')) return 'Beschreibung';
          return header || 'Unbekannt';
        });
        
        const dataRows = parsedData.filter(row => 
          row.lineNumber !== headerLine.lineNumber && 
          !row.columns.some(col => col.toLowerCase().includes('projectinfo'))
        );
        
        // Extrahiere Gewerk und Standort aus der letzten Zeile der CSV-Daten
        if (dataRows.length > 0 && onValuesExtracted) {
          const lastRow = dataRows[dataRows.length - 1];
          
          // Prüfe das Berichtsdatum für die Extraktionslogik


          
          let reportDateObj: Date;
          try {
            // Versuche verschiedene Datumsformate zu parsen
            if (reportDate) {
              reportDateObj = new Date(reportDate);
            } else if (workDate) {
              reportDateObj = new Date(workDate);
            } else {
              // Fallback: Verwende heutiges Datum
              reportDateObj = new Date();

            }
            
            // Prüfe ob das Datum gültig ist
            if (isNaN(reportDateObj.getTime())) {

              reportDateObj = new Date();
            }
          } catch (error) {

            reportDateObj = new Date();
          }
          
          const cutoffDate = new Date('2025-08-15');
          



          
          let standort = '';
          let gewerk = '';
          
          if (reportDateObj < cutoffDate) {
            // Für Berichte vor 15.08.2025: Standort in Spalte 11, Gewerk in der letzten Spalte



            
            if (lastRow.columns.length >= 11) {
              standort = lastRow.columns[10]; // Spalte 11 (Index 10)

            } else {
              console.log('âš ï¸ [Legacy Mode] Nicht genug Spalten für Standort (Spalte 11)');
            }
            
            if (lastRow.columns.length > 0) {
              gewerk = lastRow.columns[lastRow.columns.length - 1]; // Letzte Spalte

            } else {

            }
          } else {
            // Für neuere Berichte: Intelligente Spaltenerkennung

            const gewerkIndex = headers.findIndex(header => 
              header.toLowerCase().includes('gewerk') || 
              header.toLowerCase().includes('standort')
            );
            const standortIndex = headers.findIndex(header => 
              header.toLowerCase().includes('standort') || 
              header.toLowerCase().includes('location')
            );
            



            
            // Prüfe ob die Indizes gültig sind
            if (gewerkIndex >= 0 && gewerkIndex < lastRow.columns.length) {
              const gewerkValue = lastRow.columns[gewerkIndex];
              if (gewerkValue && gewerkValue.trim() !== '') {
                gewerk = gewerkValue;

              } else {

              }
            } else {
              console.log('âš ï¸ [Modern Mode] Gewerk-Index', gewerkIndex, 'ist auöŸerhalb des gültigen Bereichs (0-' + (lastRow.columns.length - 1) + ')');
            }
            
            if (standortIndex >= 0 && standortIndex < lastRow.columns.length) {
              const standortValue = lastRow.columns[standortIndex];
              if (standortValue && standortValue.trim() !== '') {
                standort = standortValue;

              } else {

              }
            } else {
              console.log('âš ï¸ [Modern Mode] Standort-Index', standortIndex, 'ist auöŸerhalb des gültigen Bereichs (0-' + (lastRow.columns.length - 1) + ')');
            }
          }
          
          // Rufe den Callback auf, um die Werte zu extrahieren
          onValuesExtracted(standort, gewerk);
          

        }
        
        return { headers, dataRows, hasHeaders: true };
      } else {
        // Fallback: Keine Header gefunden

        return { headers: [], dataRows: parsedData, hasHeaders: false };
      }
    } catch (error) {

      return null;
    }
  }, [reportData, reportDate, workDate, onValuesExtracted]);

  if (!csvData) {
    return <p className="text-sm text-red-500">Keine gültigen CSV-Daten verfügbar</p>;
  }

  const { headers, dataRows, hasHeaders } = csvData;

  if (dataRows.length === 0) {
    return <p className="text-sm text-gray-500">Keine CSV-Daten verfügbar</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Zeile</TableHead>
            <TableHead className="min-w-[120px]">Komponente</TableHead>
            <TableHead className="min-w-[120px]">Leistung</TableHead>
            <TableHead className="min-w-[80px]">Menge</TableHead>
            <TableHead className="min-w-[80px]">Std</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataRows.slice(0, 20).map((row, index) => {
            if (hasHeaders) {
              // Verwende Header-basierte Spaltensuche
              const zeileIndex = headers.findIndex(header => 
                header.toLowerCase().includes('zeile') || 
                header.toLowerCase().includes('linie') ||
                header.toLowerCase().includes('linenumber')
              );
              const komponenteIndex = headers.findIndex(header => 
                header.toLowerCase().includes('komponente') || 
                header.toLowerCase().includes('component')
              );
              const leistungIndex = headers.findIndex(header => 
                header.toLowerCase().includes('arbeit') || 
                header.toLowerCase().includes('workdone') ||
                header.toLowerCase().includes('leistung')
              );
              const mengeIndex = headers.findIndex(header => 
                header.toLowerCase().includes('menge') || 
                header.toLowerCase().includes('quantity')
              );
              const stundenIndex = headers.findIndex(header => 
                header.toLowerCase().includes('stunden') || 
                header.toLowerCase().includes('hours') ||
                header.toLowerCase().includes('std')
              );
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    {zeileIndex !== -1 ? row.columns[zeileIndex] : row.lineNumber}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={komponenteIndex !== -1 ? row.columns[komponenteIndex] : ''}>
                    {komponenteIndex !== -1 ? row.columns[komponenteIndex] : '-'}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={leistungIndex !== -1 ? row.columns[leistungIndex] : ''}>
                    {leistungIndex !== -1 ? row.columns[leistungIndex] : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {mengeIndex !== -1 ? row.columns[mengeIndex] : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {stundenIndex !== -1 ? row.columns[stundenIndex] : '-'}
                  </TableCell>
                </TableRow>
              );
            } else {
              // Fallback: Verwende erste Zeile für Spaltensuche
              const firstRow = dataRows[0];
              const zeileIndex = firstRow.columns.findIndex(col => 
                col.toLowerCase().includes('zeile') || 
                col.toLowerCase().includes('linie') ||
                col.toLowerCase().includes('linenumber')
              );
              const komponenteIndex = firstRow.columns.findIndex(col => 
                col.toLowerCase().includes('komponente') || 
                col.toLowerCase().includes('component')
              );
              const leistungIndex = firstRow.columns.findIndex(col => 
                col.toLowerCase().includes('arbeit') || 
                col.toLowerCase().includes('workdone') ||
                col.toLowerCase().includes('leistung')
              );
              const mengeIndex = firstRow.columns.findIndex(col => 
                col.toLowerCase().includes('menge') || 
                col.toLowerCase().includes('quantity')
              );
              const stundenIndex = firstRow.columns.findIndex(col => 
                col.toLowerCase().includes('stunden') || 
                col.toLowerCase().includes('hours') ||
                col.toLowerCase().includes('std')
              );
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    {zeileIndex !== -1 ? row.columns[zeileIndex] : row.lineNumber}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={komponenteIndex !== -1 ? row.columns[komponenteIndex] : ''}>
                    {komponenteIndex !== -1 ? row.columns[komponenteIndex] : '-'}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={leistungIndex !== -1 ? row.columns[leistungIndex] : ''}>
                    {leistungIndex !== -1 ? row.columns[leistungIndex] : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {mengeIndex !== -1 ? row.columns[mengeIndex] : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {stundenIndex !== -1 ? row.columns[stundenIndex] : '-'}
                  </TableCell>
                </TableRow>
              );
            }
          })}
        </TableBody>
      </Table>
      
      {dataRows.length > 20 && (
        <div className="mt-3 text-center text-sm text-gray-500">
          Zeige {dataRows.length - 20} weitere Zeilen... (Gesamt: {dataRows.length})
        </div>
      )}
      
      {/* Rohdaten Button */}
      <div className="mt-4 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onShowRawData}
          className="border-blue-500 text-blue-600 hover:bg-blue-50"
        >
          <Database className="h-4 w-4 mr-2" />
          Rohdaten anzeigen
        </Button>
      </div>
    </div>
  );
};

