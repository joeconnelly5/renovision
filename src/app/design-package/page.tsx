"use client"

import { useEffect, useState, useCallback } from "react"
import {
  FileDown,
  Palette,
  Layers,
  Image as ImageIcon,
  Table2,
  Sparkles,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  Star,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils/format"
import type {
  DesignDecision,
  WorkPackage,
  FileRecord,
  ApiResponse,
} from "@/types"

// ============================================================
// Design Package — 53 Thurston Road, Toronto
// A compiled summary of all design decisions as a professional
// interior-design presentation.
// ============================================================

// --------------- Helpers ---------------

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }
> = {
  selected: { label: "Selected", variant: "default", icon: CheckCircle2 },
  shortlisted: { label: "Shortlisted", variant: "secondary", icon: Star },
  considering: { label: "Considering", variant: "outline", icon: Clock },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
}

/**
 * Map common paint product codes to approximate hex colours.
 * For unknown codes we return a neutral warm grey.
 */
function approximateSwatchColor(productCode: string | null, brand: string | null): string {
  if (!productCode) return "#c4bfb6"

  const code = productCode.toUpperCase().replace(/\s+/g, "")
  const map: Record<string, string> = {
    // Benjamin Moore classics
    "HC-172": "#c4bbb0",   // Revere Pewter
    "OC-17": "#f5f0e7",    // White Dove
    "HC-158": "#8b8478",    // Newburyport Blue (brownish grey)
    "2163-10": "#2b2d2e",   // Onyx
    "HC-80": "#afa698",     // Bleeker Beige
    "2111-60": "#c5c1bc",   // Stonington Gray
    "2163-40": "#928b85",   // Soot (lighter)
    "OC-65": "#ddd8cf",     // Chantilly Lace
    "OC-130": "#dbd5c5",    // Cloud White
    "HC-173": "#bfb6a8",    // Edgecomb Gray
    "2125-70": "#d3d7da",   // Gray Owl
    "HC-170": "#bab3a5",    // Stonehearth
    "HC-168": "#8f877a",    // Chelsea Gray
    "HC-166": "#695e52",    // Kendall Charcoal
    "AF-685": "#928880",    // Thunder
    "2124-10": "#3a393a",   // Wrought Iron
    "CC-40": "#dcd3c1",     // Cloud White (alt)
    "CC-30": "#e8e2d5",     // Oxford White
    "PM-2": "#9a948e",      // Silver Fox
    // Sherwin-Williams
    "SW7015": "#c4bfb6",    // Repose Gray
    "SW7016": "#b3aea5",    // Mindful Gray
    "SW6119": "#c2bdb3",    // Antique White
    "SW7029": "#bab4a9",    // Agreeable Gray
    "SW7043": "#928c83",    // Worldly Gray
    "SW7044": "#a29c93",    // Amazing Gray
    // Farrow & Ball
    "FB-274": "#c4bba9",    // Ammonite
    "FB-2001": "#eee9df",   // Strong White
  }

  const directMatch = map[code]
  if (directMatch) return directMatch

  // Try stripping brand prefix patterns
  for (const key of Object.keys(map)) {
    if (code.includes(key)) return map[key]
  }

  return "#c4bfb6"
}

function formatDateLong(dateStr?: string): string {
  if (!dateStr) {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date())
  }
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr))
}

// --------------- Loading skeleton ---------------

function DesignPackageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div className="space-y-3">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-5 w-60" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

// --------------- Status badge component ---------------

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.considering
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// --------------- Color swatch component ---------------

function ColorSwatch({
  decision,
  workPackageName,
}: {
  decision: DesignDecision
  workPackageName: string | null
}) {
  const hex = approximateSwatchColor(decision.product_code, decision.brand)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Swatch block */}
      <div
        className="h-28 w-full transition-transform group-hover:scale-[1.02]"
        style={{ backgroundColor: hex }}
      />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-sm font-semibold leading-tight text-foreground">
          {decision.product_name ?? decision.title}
        </p>
        {decision.product_code && (
          <p className="font-mono text-xs text-muted-foreground">
            {decision.product_code}
          </p>
        )}
        {decision.brand && (
          <p className="text-xs text-muted-foreground">{decision.brand}</p>
        )}
        {workPackageName && (
          <div className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            {workPackageName}
          </div>
        )}
      </div>
    </div>
  )
}

// --------------- Material decision card ---------------

function MaterialCard({ decision }: { decision: DesignDecision }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {decision.image_url && (
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decision.image_url}
            alt={decision.title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}
      <CardHeader className={cn(decision.image_url ? "pt-4" : "")}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            {decision.title}
          </CardTitle>
          <StatusBadge status={decision.status} />
        </div>
        {decision.description && (
          <CardDescription className="line-clamp-3 pt-1">
            {decision.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {decision.product_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Product</span>
            <span className="font-medium">{decision.product_name}</span>
          </div>
        )}
        {decision.brand && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Brand</span>
            <span className="font-medium">{decision.brand}</span>
          </div>
        )}
        {decision.product_code && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Code</span>
            <span className="font-mono font-medium">
              {decision.product_code}
            </span>
          </div>
        )}
        {decision.price_estimate != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. Price</span>
            <span className="font-semibold">
              {formatCurrency(decision.price_estimate)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --------------- Rendering gallery item ---------------

function RenderingCard({ file }: { file: FileRecord }) {
  const publicUrl = file.storage_path

  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicUrl}
          alt={file.notes ?? file.filename}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute bottom-3 left-3 right-3 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <Badge variant="secondary" className="gap-1 bg-white/90 text-foreground">
            <Sparkles className="h-3 w-3" />
            AI Rendering
          </Badge>
        </div>
      </div>
      {file.notes && (
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{file.notes}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main Page Component
// ============================================================

export default function DesignPackagePage() {
  const [decisions, setDecisions] = useState<DesignDecision[]>([])
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([])
  const [renderings, setRenderings] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // --------------- Data fetching ---------------

  useEffect(() => {
    async function fetchData() {
      try {
        const [decisionsRes, wpRes, filesRes] = await Promise.all([
          fetch("/api/design-decisions"),
          fetch("/api/work-packages"),
          fetch("/api/files?category=rendering"),
        ])

        const decisionsJson: ApiResponse<DesignDecision[]> =
          await decisionsRes.json()
        const wpJson: ApiResponse<WorkPackage[]> = await wpRes.json()
        const filesJson: ApiResponse<FileRecord[]> = await filesRes.json()

        if (decisionsJson.data) setDecisions(decisionsJson.data)
        if (wpJson.data) setWorkPackages(wpJson.data)
        if (filesJson.data) {
          // Filter to only AI-generated renderings
          setRenderings(
            filesJson.data.filter((f) => f.ai_generated && f.category === "rendering")
          )
        }
      } catch (err) {
        console.error("Failed to fetch design package data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // --------------- Derived data ---------------

  const wpMap = new Map(workPackages.map((wp) => [wp.id, wp]))

  const styleDecisions = decisions.filter((d) => d.category === "style")
  const colorDecisions = decisions.filter((d) => d.category === "color")
  const materialDecisions = decisions.filter(
    (d) => d.category !== "style" && d.category !== "color"
  )

  // Group material decisions by work package
  const decisionsByWp = new Map<string, DesignDecision[]>()
  const unassignedDecisions: DesignDecision[] = []

  for (const d of materialDecisions) {
    if (d.work_package_id) {
      const existing = decisionsByWp.get(d.work_package_id) ?? []
      existing.push(d)
      decisionsByWp.set(d.work_package_id, existing)
    } else {
      unassignedDecisions.push(d)
    }
  }

  // Work packages that have design decisions, ordered by WP number
  const wpWithDecisions = workPackages.filter((wp) =>
    decisionsByWp.has(wp.id)
  )

  // All selected/shortlisted decisions for summary table
  const summaryDecisions = decisions.filter(
    (d) => d.status === "selected" || d.status === "shortlisted"
  )

  // Total estimated cost for selected items
  const totalEstimate = summaryDecisions.reduce(
    (sum, d) => sum + (d.price_estimate ?? 0),
    0
  )

  // --------------- PDF Export ---------------

  const exportPDF = useCallback(async () => {
    setExporting(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ])

      const element = document.getElementById("design-package-content")
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = pdfHeight
      let position = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      pdf.save("RenoVision-Design-Package.pdf")
    } catch (err) {
      console.error("PDF export failed:", err)
    } finally {
      setExporting(false)
    }
  }, [])

  // --------------- Render ---------------

  if (loading) {
    return (
      <div className="py-8">
        <DesignPackageSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      {/* ====== Header ====== */}
      <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            RenoVision
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Design Package
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            53 Thurston Road, Toronto
          </p>
          <p className="text-sm text-muted-foreground">
            Prepared {formatDateLong()}
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 self-start sm:self-auto"
          onClick={exportPDF}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {exporting ? "Generating PDF..." : "Export PDF"}
        </Button>
      </header>

      {/* ====== Printable content wrapper ====== */}
      <div id="design-package-content" className="space-y-16">
        {/* ====== Tabs navigation for quick section jumps ====== */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-8 flex w-full flex-wrap gap-1">
            <TabsTrigger value="overview" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Color Palette
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="renderings" className="gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Renderings
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5">
              <Table2 className="h-3.5 w-3.5" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* ============ OVERVIEW / DESIGN DIRECTION TAB ============ */}
          <TabsContent value="overview" className="space-y-12">
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Design Direction
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    The overall aesthetic vision for 53 Thurston Road
                  </p>
                </div>
              </div>

              {styleDecisions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No design direction decisions recorded yet. Add decisions
                      with category &ldquo;style&rdquo; to populate this
                      section.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {styleDecisions.map((d) => (
                    <Card key={d.id} className="overflow-hidden">
                      {d.image_url && (
                        <div className="relative h-64 w-full overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={d.image_url}
                            alt={d.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <h3 className="absolute bottom-4 left-6 text-xl font-semibold text-white">
                            {d.title}
                          </h3>
                        </div>
                      )}
                      <CardContent
                        className={cn(
                          "space-y-3",
                          d.image_url ? "pt-5" : "pt-6"
                        )}
                      >
                        {!d.image_url && (
                          <h3 className="text-xl font-semibold">{d.title}</h3>
                        )}
                        {d.description && (
                          <p className="leading-relaxed text-muted-foreground">
                            {d.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                          <StatusBadge status={d.status} />
                          {d.work_package_id && wpMap.has(d.work_package_id) && (
                            <span className="text-xs text-muted-foreground">
                              {wpMap.get(d.work_package_id)!.name}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Quick stats */}
            <section>
              <Separator className="mb-8" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {decisions.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Total Decisions
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {decisions.filter((d) => d.status === "selected").length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Selected
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {colorDecisions.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Colors Chosen
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(totalEstimate)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Est. Material Cost
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>

          {/* ============ COLOR PALETTE TAB ============ */}
          <TabsContent value="colors" className="space-y-8">
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Color Palette
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Paint selections and colour decisions across all spaces
                  </p>
                </div>
              </div>

              {colorDecisions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Palette className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No color decisions recorded yet. Add decisions with
                      category &ldquo;color&rdquo; to build the palette.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                  {colorDecisions.map((d) => (
                    <ColorSwatch
                      key={d.id}
                      decision={d}
                      workPackageName={
                        d.work_package_id
                          ? wpMap.get(d.work_package_id)?.name ?? null
                          : null
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* ============ MATERIALS & PRODUCTS TAB ============ */}
          <TabsContent value="materials" className="space-y-12">
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Materials & Products
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    All material and product decisions organized by work package
                  </p>
                </div>
              </div>

              {wpWithDecisions.length === 0 && unassignedDecisions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Layers className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No material or product decisions recorded yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-12">
                  {wpWithDecisions.map((wp) => {
                    const wpDecisions = decisionsByWp.get(wp.id) ?? []
                    return (
                      <div key={wp.id}>
                        <div className="mb-4 flex items-baseline gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                            {wp.number}
                          </span>
                          <h3 className="text-xl font-semibold">{wp.name}</h3>
                          <Badge variant="outline" className="ml-auto">
                            {wpDecisions.length} item
                            {wpDecisions.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                          {wpDecisions.map((d) => (
                            <MaterialCard key={d.id} decision={d} />
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* Unassigned decisions */}
                  {unassignedDecisions.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-baseline gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                          --
                        </span>
                        <h3 className="text-xl font-semibold">
                          General / Unassigned
                        </h3>
                        <Badge variant="outline" className="ml-auto">
                          {unassignedDecisions.length} item
                          {unassignedDecisions.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        {unassignedDecisions.map((d) => (
                          <MaterialCard key={d.id} decision={d} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </TabsContent>

          {/* ============ RENDERINGS GALLERY TAB ============ */}
          <TabsContent value="renderings" className="space-y-8">
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Renderings Gallery
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    AI-generated visualizations of the planned renovation
                  </p>
                </div>
              </div>

              {renderings.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No AI renderings have been generated yet. Renderings will
                      appear here once created.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {renderings.map((file) => (
                    <RenderingCard key={file.id} file={file} />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* ============ SUMMARY TABLE TAB ============ */}
          <TabsContent value="summary" className="space-y-8">
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Table2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Decision Summary
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    All selected and shortlisted decisions at a glance
                  </p>
                </div>
              </div>

              {summaryDecisions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Table2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No selected or shortlisted decisions yet. Decisions marked
                      as &ldquo;selected&rdquo; or &ldquo;shortlisted&rdquo;
                      will appear in this summary.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                              Category
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                              Item
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                              Brand
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                              Est. Price
                            </th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryDecisions.map((d, idx) => (
                            <tr
                              key={d.id}
                              className={cn(
                                "border-b transition-colors hover:bg-muted/30",
                                idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                              )}
                            >
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="capitalize">
                                  {d.category}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 font-medium">
                                {d.title}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {d.product_name ?? "--"}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {d.brand ?? "--"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                {d.price_estimate != null
                                  ? formatCurrency(d.price_estimate)
                                  : "--"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <StatusBadge status={d.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 bg-muted/30">
                            <td
                              colSpan={4}
                              className="px-4 py-3 text-right font-semibold"
                            >
                              Total Estimated
                            </td>
                            <td className="px-4 py-3 text-right text-lg font-bold text-primary">
                              {formatCurrency(totalEstimate)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* ====== Footer ====== */}
      <Separator className="mt-16 mb-6" />
      <footer className="text-center text-xs text-muted-foreground">
        <p>
          RenoVision Design Package &mdash; 53 Thurston Road, Toronto &mdash;{" "}
          {formatDateLong()}
        </p>
        <p className="mt-1">
          This document summarizes all design decisions. Final specifications
          should be confirmed with contractors prior to procurement.
        </p>
      </footer>
    </div>
  )
}
