/**
 * Category Type 2 Diagnostic Tool
 * Helps debug data structure issues
 */

import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Search, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  familyData: any;
  optionsStats: {
    total: number;
    byLevel: Record<number, number>;
    byOrder: Record<number, number>;
    byConcernId: Record<string, number>;
    missingValues: number;
    duplicateOrderLevel: Array<{ order: number; level: number; count: number }>;
  };
  sampleOptions: any[];
  issues: string[];
  recommendations: string[];
}

export const CategoryType2Diagnostic: React.FC = () => {
  const [categoryName, setCategoryName] = useState('');
  const [concernId, setConcernId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    if (!categoryName.trim()) {
      setError('Bitte Kategorie-Name eingeben');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const debugFn = httpsCallable<
        { categoryName: string; concernId?: string },
        DiagnosticResult
      >(functions, 'debugCategoryType2');

      const response = await debugFn({
        categoryName: categoryName.trim(),
        concernId: concernId.trim() || undefined,
      });

      setResult(response.data);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      setError(err.message || 'Fehler bei der Diagnose');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Category Type 2 Diagnostic Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="diag-category">Kategorie-Name *</Label>
            <Input
              id="diag-category"
              placeholder="z.B. Cables, Parts"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="diag-concern">Concern ID (optional)</Label>
            <Input
              id="diag-concern"
              placeholder="z.B. LUFGENERIC oder specific ID"
              value={concernId}
              onChange={(e) => setConcernId(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <Button onClick={runDiagnostic} disabled={loading || !categoryName.trim()}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analysiere...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Diagnose starten
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-800">Fehler</div>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            {/* Family Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Family Document</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(result.familyData, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Options Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>Total Options:</strong> {result.optionsStats.total}
                </div>
                <div>
                  <strong>By Level:</strong>
                  <div className="ml-4 text-sm">
                    {Object.entries(result.optionsStats.byLevel).map(([level, count]) => (
                      <div key={level}>
                        Level {level}: {count}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <strong>By Order (first 10):</strong>
                  <div className="ml-4 text-sm">
                    {Object.entries(result.optionsStats.byOrder)
                      .slice(0, 10)
                      .map(([order, count]) => (
                        <div key={order}>
                          Order {order}: {count} options
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <strong>By ConcernId:</strong>
                  <div className="ml-4 text-sm">
                    {Object.entries(result.optionsStats.byConcernId).map(([cid, count]) => (
                      <div key={cid}>
                        {cid}: {count}
                      </div>
                    ))}
                  </div>
                </div>
                {result.optionsStats.missingValues > 0 && (
                  <div className="text-orange-600">
                    <strong>Missing Values:</strong> {result.optionsStats.missingValues}
                  </div>
                )}
                {result.optionsStats.duplicateOrderLevel.length > 0 && (
                  <div className="text-red-600">
                    <strong>Duplicate Order+Level:</strong>
                    <div className="ml-4 text-sm">
                      {result.optionsStats.duplicateOrderLevel.map((dup, idx) => (
                        <div key={idx}>
                          Order {dup.order}, Level {dup.level}: {dup.count} duplicates
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Issues */}
            {result.issues.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    Issues Found ({result.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {result.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                    <CheckCircle className="w-5 h-5" />
                    Recommendations ({result.recommendations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Sample Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sample Options (first 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(result.sampleOptions, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryType2Diagnostic;






