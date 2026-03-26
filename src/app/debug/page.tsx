'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

// Import JSON data directly
import fieldsData from '@/data/normalized/fields.json';
import optionsData from '@/data/normalized/options.json';
import blocksData from '@/data/normalized/blocks.json';
import paramsData from '@/data/normalized/params.json';
import metaData from '@/data/normalized/meta.json';
import rowCountsData from '@/data/normalized/row_counts.json';

interface ValidationError {
  type: string;
  category_id?: string;
  option_id?: string;
  value?: string;
  message: string;
  severity: 'error' | 'warning';
}

export default function DebugPage() {
  const [activeSection, setActiveSection] = useState<string>('summary');

  // Perform validation
  const validationResults = useMemo(() => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const fields = fieldsData.fields || [];
    const options = optionsData.options || [];
    const fieldCategoryIds = new Set(fields.map((f: any) => f.category_id));

    // Check 1: Options with category_id not in fields
    for (const option of options) {
      if (option.category_id && !fieldCategoryIds.has(option.category_id)) {
        errors.push({
          type: 'orphan_category',
          category_id: option.category_id,
          option_id: option.option_id,
          message: `Option "${option.label}" has category_id "${option.category_id}" which does not exist in fields`,
          severity: 'error',
        });
      }
    }

    // Check 2: Empty labels
    for (const option of options) {
      if (!option.label || option.label.trim() === '') {
        warnings.push({
          type: 'empty_label',
          option_id: option.option_id,
          category_id: option.category_id,
          message: `Option has empty label (value: "${option.value}")`,
          severity: 'warning',
        });
      }
    }

    // Check 3: Empty values
    for (const option of options) {
      if (!option.value || option.value.trim() === '') {
        errors.push({
          type: 'empty_value',
          option_id: option.option_id,
          category_id: option.category_id,
          message: `Option has empty value (label: "${option.label}")`,
          severity: 'error',
        });
      }
    }

    // Check 4: Duplicate values within same category
    const categoryValues = new Map<string, Set<string>>();
    for (const option of options) {
      const key = option.category_id;
      if (!categoryValues.has(key)) {
        categoryValues.set(key, new Set());
      }
      const values = categoryValues.get(key)!;
      if (values.has(option.value)) {
        warnings.push({
          type: 'duplicate',
          category_id: option.category_id,
          value: option.value,
          message: `Duplicate value "${option.value}" in category "${option.category_id}"`,
          severity: 'warning',
        });
      }
      values.add(option.value);
    }

    // Check 5: Fields without options
    for (const field of fields) {
      const hasOptions = options.some((o: any) => o.category_id === field.category_id);
      if (!hasOptions) {
        warnings.push({
          type: 'missing_options',
          category_id: field.category_id,
          message: `Field "${field.label}" has no associated options`,
          severity: 'warning',
        });
      }
    }

    return { errors, warnings };
  }, []);

  // Count default_generated items
  const defaultGeneratedCounts = useMemo(() => {
    const fields = fieldsData.fields || [];
    const options = optionsData.options || [];
    
    return {
      fields: fields.filter((f: any) => f.default_generated).length,
      options: options.filter((o: any) => o.default_generated).length,
    };
  }, []);

  const totalErrors = validationResults.errors.length;
  const totalWarnings = validationResults.warnings.length;
  const isHealthy = totalErrors === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Debug Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Data quality validation & diagnostics
              </p>
            </div>
          </div>

          {/* Health Status */}
          <div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              ${isHealthy ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'}
            `}
          >
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">All Checks Passed</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span className="font-medium">
                  {totalErrors} Error{totalErrors !== 1 ? 's' : ''}, {totalWarnings} Warning{totalWarnings !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {['summary', 'errors', 'data', 'state'].map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`
                  px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors
                  ${
                    activeSection === section
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {section}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-4">
        {activeSection === 'summary' && (
          <SummarySection
            rowCounts={rowCountsData}
            defaultGenerated={defaultGeneratedCounts}
            errorCount={totalErrors}
            warningCount={totalWarnings}
          />
        )}

        {activeSection === 'errors' && (
          <ErrorsSection
            errors={validationResults.errors}
            warnings={validationResults.warnings}
          />
        )}

        {activeSection === 'data' && <DataSection />}

        {activeSection === 'state' && <StateSection />}
      </main>
    </div>
  );
}

// Summary Section
interface SummarySectionProps {
  rowCounts: any;
  defaultGenerated: { fields: number; options: number };
  errorCount: number;
  warningCount: number;
}

function SummarySection({
  rowCounts,
  defaultGenerated,
  errorCount,
  warningCount,
}: SummarySectionProps) {
  return (
    <div className="space-y-6">
      {/* Row Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Fields"
          value={fieldsData.count}
          sublabel="Categories"
        />
        <StatCard
          label="Options"
          value={optionsData.count}
          sublabel="Total options"
        />
        <StatCard
          label="Params"
          value={paramsData.count}
          sublabel="Parameters"
        />
        <StatCard
          label="Models"
          value={blocksData.count}
          sublabel="AI models"
        />
      </div>

      {/* Validation Summary */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Validation Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                errorCount === 0
                  ? 'bg-green-100 text-green-600 dark:bg-green-950/50'
                  : 'bg-red-100 text-red-600 dark:bg-red-950/50'
              }`}
            >
              {errorCount === 0 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="font-semibold">{errorCount}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                warningCount === 0
                  ? 'bg-green-100 text-green-600 dark:bg-green-950/50'
                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950/50'
              }`}
            >
              {warningCount === 0 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="font-semibold">{warningCount}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-950/50">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">{defaultGenerated.fields}</div>
              <div className="text-sm text-muted-foreground">
                Auto-gen Fields
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-950/50">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">{defaultGenerated.options}</div>
              <div className="text-sm text-muted-foreground">
                Auto-gen Options
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Row Counts */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Sheet Row Counts</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Raw Data
            </h4>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(rowCounts.raw || {}).map(([sheet, count]) => (
                  <tr key={sheet} className="border-b border-border">
                    <td className="py-2">{sheet}</td>
                    <td className="py-2 text-right font-mono">{String(count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Normalized Data
            </h4>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(rowCounts.normalized || {}).map(
                  ([type, count]) => (
                    <tr key={type} className="border-b border-border">
                      <td className="py-2">{type}</td>
                      <td className="py-2 text-right font-mono">{String(count)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card
function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel: string;
}) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </div>
  );
}

// Errors Section
interface ErrorsSectionProps {
  errors: ValidationError[];
  warnings: ValidationError[];
}

function ErrorsSection({ errors, warnings }: ErrorsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Errors */}
      <div className="border border-red-200 rounded-lg dark:border-red-900/50">
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 dark:bg-red-950/30 dark:border-red-900/50">
          <h3 className="font-semibold text-red-700 dark:text-red-400">
            Errors ({errors.length})
          </h3>
        </div>
        <div className="p-4">
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors found</p>
          ) : (
            <div className="space-y-2">
              {errors.map((error, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg dark:bg-red-950/20"
                >
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{error.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Type: {error.type}
                      {error.category_id && ` | Category: ${error.category_id}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      <div className="border border-yellow-200 rounded-lg dark:border-yellow-900/50">
        <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50">
          <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
            Warnings ({warnings.length})
          </h3>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warnings found</p>
          ) : (
            <div className="space-y-2">
              {warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-yellow-50/50 rounded-lg dark:bg-yellow-950/20"
                >
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{warning.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Type: {warning.type}
                      {warning.category_id && ` | Category: ${warning.category_id}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Data Section
function DataSection() {
  const [selectedData, setSelectedData] = useState<string>('fields');

  const dataMap: Record<string, any> = {
    fields: fieldsData,
    options: optionsData,
    params: paramsData,
    blocks: blocksData,
    meta: metaData,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Object.keys(dataMap).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedData(key)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors
              ${
                selectedData === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }
            `}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <pre className="p-4 text-xs font-mono bg-muted/30 max-h-[600px] overflow-auto">
          {JSON.stringify(dataMap[selectedData], null, 2)}
        </pre>
      </div>
    </div>
  );
}

// State Section
function StateSection() {
  const [storeState, setStoreState] = useState<any>(null);

  useEffect(() => {
    // Get store state from localStorage
    const stored = localStorage.getItem('prompt-studio-storage');
    if (stored) {
      try {
        setStoreState(JSON.parse(stored));
      } catch {
        setStoreState({ error: 'Failed to parse store state' });
      }
    }
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Current App State (LocalStorage)</h3>
      <div className="border border-border rounded-lg overflow-hidden">
        <pre className="p-4 text-xs font-mono bg-muted/30 max-h-[600px] overflow-auto">
          {storeState
            ? JSON.stringify(storeState, null, 2)
            : 'No persisted state found'}
        </pre>
      </div>
    </div>
  );
}
