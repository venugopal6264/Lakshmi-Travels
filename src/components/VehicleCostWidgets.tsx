import React, { useMemo, useState } from 'react';
import { Car, Bike, TrendingUp, Fuel, Wrench, Info } from 'lucide-react';
import { ApiFuel } from '../services/api';
import { withAlpha } from '../utils/common/utils';

export interface VehicleDoc {
    _id: string;
    name: string;
    type: 'car' | 'bike';
    color?: string;
    model?: string;
    manufacturerDate?: string | null;
    buyDate?: string | null;
    fuelType?: string;
    fuelCapacity?: number | null;
    licensePlate?: string;
    chassisNumber?: string;
    notes?: string;
}

interface VehicleCostWidgetsProps {
    vehicles: VehicleDoc[];
    fuel: ApiFuel[];
    onVehicleClick?: (vehicle: VehicleDoc) => void;
    selectedVehicleId?: string | null;
}

interface VehicleCost {
    vehicleId: string;
    vehicleName: string;
    vehicleType: 'car' | 'bike';
    vehicleColor: string;
    fuelCost: number;
    serviceCost: number;
    repairCost: number;
    totalCost: number;
    lastServiceDate: string | null;
    lastServiceOdometer: number | null;
    kmSinceService: number | null;
    daysAgo: number | null;
}

export const VehicleCostWidgets: React.FC<VehicleCostWidgetsProps> = ({
    vehicles,
    fuel,
    onVehicleClick,
    selectedVehicleId
}) => {
    const [expandedInfoId, setExpandedInfoId] = useState<string | null>(null);

    const vehicleCosts = useMemo(() => {
        const today = Date.now();
        const costs: VehicleCost[] = vehicles.map(vehicle => {
            const vehicleEntries = fuel.filter(e => e.vehicleId === vehicle._id);

            let fuelCost = 0;
            let serviceCost = 0;
            let repairCost = 0;

            vehicleEntries.forEach(entry => {
                const amount = entry.total || 0;
                if (entry.entryType === 'refueling') {
                    fuelCost += amount;
                } else if (entry.entryType === 'service') {
                    serviceCost += amount;
                } else if (entry.entryType === 'repair') {
                    repairCost += amount;
                }
            });

            // Find last service entry
            const serviceEntries = vehicleEntries.filter(e => e.entryType === 'service');
            let lastService: ApiFuel | null = null;
            let lastServiceTime = 0;

            if (serviceEntries.length > 0) {
                for (const entry of serviceEntries) {
                    const entryTime = new Date(entry.date || 0).getTime();
                    if (entryTime > lastServiceTime) {
                        lastService = entry;
                        lastServiceTime = entryTime;
                    }
                }
            }

            // Calculate km since last service
            let kmSinceService: number | null = null;
            const serviceOdo = lastService && typeof lastService.odometer === 'number' ? lastService.odometer : null;

            if (serviceOdo != null && lastService?.date) {
                const serviceTime = new Date(lastService.date).getTime();
                let latestRefuelOdo: number | null = null;
                let latestRefuelTime = -1;

                for (const entry of vehicleEntries) {
                    if (entry.entryType !== 'refueling' || !entry.date) continue;
                    const entryTime = new Date(entry.date).getTime();
                    if (entryTime < serviceTime) continue; // only after service
                    if (typeof entry.odometer !== 'number') continue;

                    if (entryTime > latestRefuelTime) {
                        latestRefuelTime = entryTime;
                        latestRefuelOdo = entry.odometer;
                    }
                }

                if (latestRefuelOdo != null) {
                    kmSinceService = latestRefuelOdo - serviceOdo;
                    if (kmSinceService < 0) kmSinceService = 0;
                } else {
                    kmSinceService = 0;
                }
            }

            const daysAgo = lastService?.date
                ? Math.floor((today - new Date(lastService.date).getTime()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                vehicleId: vehicle._id,
                vehicleName: vehicle.name,
                vehicleType: vehicle.type,
                vehicleColor: vehicle.color || '#3b82f6',
                fuelCost,
                serviceCost,
                repairCost,
                totalCost: fuelCost + serviceCost + repairCost,
                lastServiceDate: lastService?.date || null,
                lastServiceOdometer: serviceOdo,
                kmSinceService,
                daysAgo
            };
        });

        return costs.sort((a, b) => b.totalCost - a.totalCost);
    }, [vehicles, fuel]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (vehicles.length === 0) {
        return null;
    }

    return (
        <div className="mb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {vehicleCosts.map(cost => {
                    const Icon = cost.vehicleType === 'car' ? Car : Bike;
                    const isSelected = selectedVehicleId === cost.vehicleId;
                    const color = cost.vehicleColor;
                    const vehicle = vehicles.find(v => v._id === cost.vehicleId);
                    const isInfoExpanded = expandedInfoId === cost.vehicleId;

                    return (
                        <div
                            key={cost.vehicleId}
                            className={`rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${isSelected ? 'ring-2' : ''
                                }`}
                            style={{
                                background: `linear-gradient(135deg, ${withAlpha(color, 0.08)}, ${withAlpha(color, 0.02)})`,
                                borderColor: isSelected ? color : withAlpha(color, 0.2),
                                borderWidth: isSelected ? '2px' : '1px',
                                borderStyle: 'solid'
                            }}
                        >
                            <div className="p-2">
                                {/* Header with vehicle name and icon */}
                                <div className="flex items-center justify-between mb-2">
                                    <div
                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                        onClick={() => onVehicleClick?.(vehicle!)}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center"
                                            style={{ background: color, color: '#fff' }}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-800">{cost.vehicleName}</h4>
                                            <p className="text-xs text-gray-500 capitalize">{cost.vehicleType}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedInfoId(isInfoExpanded ? null : cost.vehicleId);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium hover:bg-gray-50 border transition-colors"
                                        style={{
                                            color: color,
                                            borderColor: withAlpha(color, 0.3),
                                            backgroundColor: isInfoExpanded ? withAlpha(color, 0.08) : 'transparent'
                                        }}
                                        title="Toggle vehicle info"
                                    >
                                        <Info className="h-3.5 w-3.5" />
                                        <span>Info</span>
                                    </button>
                                </div>

                                {/* Cost Breakdown */}
                                <div className="space-y-2 mb-3">
                                    {/* Total Cost */}
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4" style={{ color: color }} />
                                            <span className="text-gray-600">Total Cost</span>
                                        </div>
                                        <span className="font-semibold text-gray-700">
                                            {formatCurrency(cost.totalCost)}
                                        </span>
                                    </div>

                                    {/* Fuel Cost */}
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Fuel className="w-4 h-4" style={{ color: withAlpha(color, 0.7) }} />
                                            <span className="text-gray-600">Fuel</span>
                                        </div>
                                        <span className="font-semibold text-gray-700">
                                            {formatCurrency(cost.fuelCost)}
                                        </span>
                                    </div>

                                    {/* Service Cost */}
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-4 h-4" style={{ color: withAlpha(color, 0.7) }} />
                                            <span className="text-gray-600">Service</span>
                                        </div>
                                        <span className="font-semibold text-gray-700">
                                            {formatCurrency(cost.serviceCost)}
                                        </span>
                                    </div>

                                    {/* Repair Cost */}
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-4 h-4" style={{ color: withAlpha(color, 0.5) }} />
                                            <span className="text-gray-600">Repair</span>
                                        </div>
                                        <span className="font-semibold text-gray-700">
                                            {formatCurrency(cost.repairCost)}
                                        </span>
                                    </div>
                                </div>
                                {/* Last Service Information */}
                                {cost.lastServiceDate ? (
                                    <div
                                        className="mt-3 pt-3 border-t space-y-1.5"
                                        style={{ borderColor: withAlpha(color, 0.2) }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">Last Service</span>
                                            {cost.daysAgo != null && (
                                                <span
                                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                    style={{
                                                        background: withAlpha(color, 0.1),
                                                        color: color
                                                    }}
                                                >
                                                    {cost.daysAgo === 0 ? 'Today' : `${cost.daysAgo} day${cost.daysAgo === 1 ? '' : 's'} ago`}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-800">
                                            {new Date(cost.lastServiceDate).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                                            {cost.lastServiceOdometer != null && (
                                                <div>
                                                    Odometer: <span className="font-medium text-gray-800">
                                                        {Math.round(cost.lastServiceOdometer).toLocaleString()} km
                                                    </span>
                                                </div>
                                            )}
                                            {cost.kmSinceService != null && (
                                                <div>
                                                    Since: <span className="font-medium text-gray-800">
                                                        {Math.round(cost.kmSinceService).toLocaleString()} km
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="mt-3 pt-3 border-t"
                                        style={{ borderColor: withAlpha(color, 0.2) }}
                                    >
                                        <span className="text-xs text-gray-500 italic">No service record</span>
                                    </div>
                                )}

                                {/* Expandable Vehicle Info Section */}
                                {isInfoExpanded && vehicle && (
                                    <div
                                        className="mt-3 pt-3 border-t"
                                        style={{ borderColor: withAlpha(color, 0.2) }}
                                    >
                                        <h5 className="text-xs font-semibold text-gray-700 mb-2">Vehicle Details</h5>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                            {vehicle.model && (
                                                <div>
                                                    <span className="text-gray-500">Model: </span>
                                                    <span className="text-gray-800 font-medium">{vehicle.model}</span>
                                                </div>
                                            )}
                                            {vehicle.manufacturerDate && (
                                                <div>
                                                    <span className="text-gray-500">Mfg: </span>
                                                    <span className="text-gray-800 font-medium">
                                                        {new Date(vehicle.manufacturerDate).toLocaleDateString('en-GB', {
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                            {vehicle.buyDate && (
                                                <div>
                                                    <span className="text-gray-500">Buy: </span>
                                                    <span className="text-gray-800 font-medium">
                                                        {String(vehicle.buyDate).slice(0, 10)}
                                                    </span>
                                                </div>
                                            )}
                                            {vehicle.fuelType && (
                                                <div>
                                                    <span className="text-gray-500">Fuel: </span>
                                                    <span className="text-gray-800 font-medium">{vehicle.fuelType}</span>
                                                </div>
                                            )}
                                            {vehicle.fuelCapacity != null && (
                                                <div>
                                                    <span className="text-gray-500">Capacity: </span>
                                                    <span className="text-gray-800 font-medium">{vehicle.fuelCapacity} L</span>
                                                </div>
                                            )}
                                            {vehicle.licensePlate && (
                                                <div>
                                                    <span className="text-gray-500">Plate: </span>
                                                    <span className="text-gray-800 font-medium">{vehicle.licensePlate}</span>
                                                </div>
                                            )}
                                            {vehicle.chassisNumber && (
                                                <div className="col-span-2">
                                                    <span className="text-gray-500">Chassis: </span>
                                                    <span className="text-gray-800 font-medium">{vehicle.chassisNumber}</span>
                                                </div>
                                            )}
                                            {vehicle.notes && (
                                                <div className="col-span-2 pt-1">
                                                    <span className="text-gray-500">Notes: </span>
                                                    <span className="text-gray-800 font-medium line-clamp-2">{vehicle.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
