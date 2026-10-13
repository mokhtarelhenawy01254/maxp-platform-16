import { useTranslation } from "react-i18next";
import React from "react";
import {
  TrashIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { CartItem } from "../types";
import { useAuth } from "../../../../hooks/useAuthSimple";
import { buildOptimizedUploadImageUrl } from "../../../../utils/imageUrl";

interface CartColumnProps {
  items: CartItem[];
  onUpdateItem: (
    productId: string,
    updates: Partial<CartItem>,
    variantId?: string,
  ) => void;
  onRemoveItem: (productId: string, variantId?: string) => void;
}

const CartColumn: React.FC<CartColumnProps> = ({
  items,
  onUpdateItem,
  onRemoveItem,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAffiliate = user?.role === "AFFILIATE";
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

    return (
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xs border border-gray-200/80 dark:border-gray-800 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
            <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex justify-between items-center">
                <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-gray-900 dark:text-white">{t('manualOrder.k_72')}{items.length})</h2>
                <div className="text-xs font-semibold font-mono tabular-nums text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 px-2.5 py-1 rounded-md shadow-2xs">
                    {t('manualOrder.k_77')} {totalAmount.toLocaleString()} {t('manualOrder.k_84')}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-2 manual-order-scroll manual-order-column">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <CalculatorIcon className="w-12 h-12 mb-2 opacity-50" />
                        <p>{t('manualOrder.k_57')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={`${item.productId}-${item.variantId || 'default'}`}
                                className={`flex gap-3 p-3 bg-white dark:bg-gray-800 border rounded-lg group transition-colors ${item.quantity > item.stock ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600'}`}
                            >
                                {/* Image */}
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden flex-shrink-0">
                                    {item.image ? (
                                        <img src={buildOptimizedUploadImageUrl(item.image, { width: 150 })} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 dark:bg-gray-600" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-1">
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">{item.name}</h3>
                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                                    {item.price.toLocaleString()} {t('manualOrder.k_75')}
                                                </span>
                                            </div>
                                            {(item.color || item.size) && (
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {item.color && (
                                                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                                            {t('manualOrder.k_85')} {item.color}
                                                        </span>
                                                    )}
                                                    {item.size && (
                                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                                            {t('manualOrder.k_86')} {item.size}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {item.variantName &&
                                                item.variantName !== [item.color, item.size].filter(Boolean).join(" / ") && (
                                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5 truncate">
                                                        {item.variantName}
                                                    </div>
                                                )}
                                            {/* Stock indicator */}
                                            <div className={`text-[10px] mt-0.5 ${item.quantity > item.stock ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {item.quantity > item.stock ? (
                                                    <span className="flex items-center gap-1">
                                                        <ExclamationTriangleIcon className="w-3 h-3" />
                                                        {t('manualOrder.k_87')} {item.stock})
                                                    </span>
                                                ) : (
                                                    <span>{t('manualOrder.k_73')}{item.stock}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemoveItem(item.productId, item.variantId)}
                                            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 mr-2"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="flex items-center gap-4">
                                            {/* Quantity Control */}
                                            <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                                                <button
                                                    className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold"
                                                    onClick={() => {
                                                        if (item.quantity > 1) onUpdateItem(item.productId, { quantity: item.quantity - 1 }, item.variantId);
                                                        else onRemoveItem(item.productId, item.variantId);
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        if (val >= 0) onUpdateItem(item.productId, { quantity: val }, item.variantId);
                                                    }}
                                                    className="w-12 text-center text-sm bg-transparent dark:text-gray-100 border-none focus:ring-0 p-1"
                                                />
                                                <button
                                                    className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold"
                                                    onClick={() => onUpdateItem(item.productId, { quantity: item.quantity + 1 }, item.variantId)}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Final Price for Member */}
                                            <div className="flex-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('manualOrder.k_74')}</div>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={item.price}
                                                        readOnly={isAffiliate}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            onUpdateItem(item.productId, { price: val }, item.variantId);
                                                        }}
                                                        className={`w-full text-sm border-gray-200 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-2 pl-8 font-bold dark:bg-gray-700 dark:text-gray-100 ${isAffiliate ? 'bg-gray-50 dark:bg-gray-800' : (item.price !== item.originalPrice ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' : 'text-gray-700 dark:text-gray-300')}`}
                                                    />
                                                    <span className="absolute left-2 top-1.5 text-xs text-gray-400 dark:text-gray-500">{t('manualOrder.k_75')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Affiliate Markup Field */}
                                        {isAffiliate && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">{t('manualOrder.k_76')}</div>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={item.markup || 0}
                                                            onChange={(e) => {
                                                                const markup = parseFloat(e.target.value) || 0;
                                                                onUpdateItem(item.productId, {
                                                                    markup: markup,
                                                                    price: item.originalPrice + markup
                                                                }, item.variantId);
                                                            }}
                                                            className="w-full text-xs border-blue-200 dark:border-blue-800 rounded-md focus:ring-blue-500 focus:border-blue-500 pr-2 pl-8 font-bold bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300"
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute left-2 top-1 text-[10px] text-blue-400 dark:text-blue-500">{t('manualOrder.k_75')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-end items-end pb-1 pr-1">
                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500">{t('manualOrder.k_77')}</div>
                                                    <div className="text-sm font-bold text-gray-700 dark:text-gray-100">
                                                        {(item.price * item.quantity).toLocaleString()} {t('manualOrder.k_75')}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!isAffiliate && item.price !== item.originalPrice && (
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 text-right flex justify-end gap-1">
                                                <span>{t('manualOrder.k_78')}{item.originalPrice}</span>
                                                <button
                                                    className="text-blue-500 dark:text-blue-400 hover:underline"
                                                    onClick={() => onUpdateItem(item.productId, { price: item.originalPrice }, item.variantId)}
                                                >
                                                    {t('manualOrder.k_88')}
                                                </button>
                                            </div>
                                        )}

                                        {!isAffiliate && (
                                            <div className="text-sm font-bold text-gray-700 dark:text-gray-100 text-left self-end">
                                                {(item.price * item.quantity).toLocaleString()} {t('manualOrder.k_75')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer / Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">{t('manualOrder.k_79')}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{items.reduce((acc, item) => acc + item.quantity, 0)}</span>
                </div>
                {isAffiliate && (
                    <div className="flex justify-between items-center text-sm mb-2 text-blue-600 dark:text-blue-400">
                        <span>{t('manualOrder.k_80')}</span>
                        <span className="font-bold">{items.reduce((sum, item) => sum + (item.markup * item.quantity), 0).toLocaleString()}{t('manualOrder.k_75')}</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-gray-800 dark:text-gray-100">{t('manualOrder.k_81')}</span>
                    <span className="text-blue-600 dark:text-blue-400">{totalAmount.toLocaleString()}{t('manualOrder.k_75')}</span>
                </div>
            </div>
        </div>
    );
};

export default CartColumn;
