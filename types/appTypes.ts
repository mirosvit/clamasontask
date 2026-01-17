export interface UserData {
  id?: string;
  username: string;
  password: string;
  role: 'ADMIN' | 'USER' | 'LEADER';
  nickname?: string;
  canExportAnalytics?: boolean;
}

export interface ScrapBin {
  id: string;
  name: string;
  tara: number;
}

export interface ScrapMetal {
  id: string;
  type: string;
  description: string;
}

export interface ScrapPrice {
  id: string;
  metalId: string;
  month: number;
  year: number;
  price: number;
}

export interface ScrapRecord {
  id: string;
  metalId: string;
  binId: string;
  gross: number;
  tara: number;
  netto: number;
  timestamp: number;
  worker: string;
  taskId: string;
}

export interface DBItem {
  id: string;
  value: string;
  standardTime?: number; // Legacy / Fallback
  setupTime?: number;    // Fixná zložka (príprava)
  unitTime?: number;     // Variabilná zložka (na kus)
  description?: string;
  coordX?: number;
  coordY?: number;
  distancePx?: number;
  defaultSourceSectorId?: string;
  defaultTargetSectorId?: string;
}

export interface MapSector {
  id: string;
  name: string;
  coordX: number;
  coordY: number;
  color?: string;
  order?: number;
}

export interface MapObstacle {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'rack' | 'wall';
}

export type PriorityLevel = 'LOW' | 'NORMAL' | 'URGENT';

export interface InventorySession {
    start: number;
    end?: number;
}

export interface ERPBlockage {
    id: string;
    partNumber: string;
    quantity: string;
    userNote: string;
    adminNote?: string;
    status: 'waiting' | 'resolving' | 'ready';
    createdBy: string;
    timestamp: number;
    resolvedBy?: string;
    resolvedAt?: number;
}

export interface Task {
  id: string; 
  text: string;
  partNumber?: string;
  workplace?: string;
  quantity?: string;
  quantityUnit?: string;
  standardTime?: number;
  isDone: boolean;
  priority?: PriorityLevel; 
  completionTime?: string;
  completedBy?: string | null;
  status?: 'completed' | 'incorrectly_entered';
  isMissing?: boolean;
  missingReportedBy?: string | null;
  missingReason?: string;
  isInProgress?: boolean;
  inProgressBy?: string | null;
  createdAt?: number; 
  createdBy?: string;
  startedAt?: number; 
  completedAt?: number; 
  note?: string;
  plate?: string;
  isBlocked?: boolean; 
  blockedBy?: string | null; 
  isManualBlocked?: boolean; 
  inventoryHistory?: InventorySession[];
  isLogistics?: boolean; 
  isProduction?: boolean;
  isAuditInProgress?: boolean;
  auditBy?: string | null;
  auditFinalBadge?: string | null;
  auditedBy?: string | null;
  auditedAt?: number | null;
  auditResult?: 'OK' | 'NOK' | null;
  auditNote?: string | null;
  expireAt?: number;
  searchExhausted?: boolean;
  searchedBy?: string | null;
  pickedFromSectorId?: string;
  // Logistické trasovanie
  sourceSectorId?: string;
  targetSectorId?: string;
  // Anti-Cheat flag pre analytiku
  isInvalid?: boolean; 
}

export interface Notification {
    id: string;
    partNumber: string;
    reason: string;
    reportedBy: string;
    targetUser: string; 
    timestamp: number;
}

export interface AdminNote {
    id: string;
    text: string;
    author: string;
    createdAt: number;
    color?: string;
}

export interface PartRequest {
    id: string;
    partNumber: string;
    requestedBy: string;
    requestedAt: number;
}

export interface BOMRequest {
    id: string;
    parentPart: string;
    requestedBy: string;
    requestedAt: number;
}

export interface BreakSchedule {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
}

export interface SystemBreak {
    id: string;
    start: number;
    end?: number;
    isActive: boolean;
}

export interface BOMComponent {
    child: string;
    consumption: number;
}

export interface Role {
    id: string;
    name: string;
    parentId?: string;
    rank?: number;
    isSystem?: boolean;
    permissions?: string[]; // NOVÉ: Vnorené oprávnenia
}

// Legacy - bude odstránené po migrácii
export interface Permission {
    id: string;
    roleId: string;
    permissionName: string;
}

export interface SystemConfig {
    maintenanceMode: boolean;
    maintenanceStart?: string;
    maintenanceEnd?: string;
    allowedIPs: string[];
    ipCheckEnabled: boolean;
    adminKey?: string;
    adminLockEnabled?: boolean;
    mapOriginX?: number;
    mapOriginY?: number;
    vzvSpeed?: number;
    tabOrder?: string[];
}