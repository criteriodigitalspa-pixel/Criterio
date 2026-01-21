import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import historicalDB from '../data/historicalSalesDB.json';

class PriceEstimator {
    constructor() {
        this.baseData = historicalDB;
        this.livePrices = { RAM: [], STORAGE: [] };
        this.lastFetch = 0;
    }

    /**
     * Finds the closest match in historical DB
     */
    _findBaseMatch(ticket) {
        // Normalize ticket data to match DB keys
        const tBrand = (ticket.marca || '').toUpperCase();
        const tModel = (ticket.modelo || '').toUpperCase();
        const tCpu = (ticket.additionalInfo?.cpuBrand || '').toUpperCase(); // e.g. I5
        const tGen = (ticket.additionalInfo?.cpuGen || '').toUpperCase(); // e.g. 8VA

        // Filter: Brand + CPU Family (Minimum requirement)
        // We relax "Model" strictness because "LATITUDE 5490" vs "LATITUDE"
        const candidates = this.baseData.filter(item =>
            item.brand === tBrand &&
            item.cpu.includes(tCpu) && // "I5" matches "CORE I5"
            item.gen === tGen
        );

        if (candidates.length === 0) return null;

        // Best Match? Maybe specific model?
        const exactModel = candidates.find(item => item.model === tModel);
        if (exactModel) return exactModel;

        // Fallback: Average of all candidates (General "DELL I5 8VA")
        const total = candidates.reduce((sum, c) => sum + c.avgPrice, 0);
        return {
            avgPrice: Math.round(total / candidates.length),
            sampleCount: candidates.length,
            isGeneric: true
        };
    }

    /**
     * Loads current component prices from Firestore (Cache 5 min)
     */
    async _ensureLivePrices() {
        if (Date.now() - this.lastFetch < 300000 && this.livePrices.RAM.length > 0) return;

        try {
            const snap = await getDocs(collection(db, 'hardware_prices'));
            const prices = snap.docs.map(d => d.data());

            this.livePrices = {
                RAM: prices.filter(p => p.category === 'RAM'),
                STORAGE: prices.filter(p => p.category === 'STORAGE')
            };
            this.lastFetch = Date.now();
        } catch (e) {
            console.error("Error fetching live prices:", e);
        }
    }

    async getSuggestedPrice(ticket) {
        await this._ensureLivePrices();

        const baseMatch = this._findBaseMatch(ticket);
        const basePrice = baseMatch ? baseMatch.avgPrice : 0;

        // Calculate Component Adjustments
        // Logic: Did we ADD components? (Upgrade)
        // We look at ticket.upgrades (if we tracked them) or infer?
        // User asked: "Si el equipo tiene upgrades (UPRAM/UPALM), sumará el valor..."
        // Currently ticket structure doesn't explicitly have UPRAM/UPALM fields in the main object easily accessible 
        // unless they were added in the "Work Log" or specific fields.
        // For now, I will assume we look at the TOTAL specs and compare to "Base" rules? 
        // OR simpler: The user enters the final price, we just SUGGEST based on the final config.

        // Wait, the PriceEstimator logic in plan was: 
        // Formula: Precio Sugerido = Promedio Base + (Valor Upgrade - Valor Downgrade).
        // This implies we know what was upgraded.
        // If we don't have explicit upgrade fields, maybe we just price the FINAL configuration?

        // BETTER APPROACH for now:
        // Find the generic base price for this model/cpu/gen.
        // If the current ticket has 16GB RAM and the base had 8GB, we add the diff.
        // BUT historicalDB has "RAM" in the key. So `findBaseMatch` actually finds the price for THAT specific config if it exists.

        // So:
        // 1. Try to find EXACT config match (Model + CPU + Gen + RAM).
        // 2. If valid, return that avgPrice.
        // 3. If not, find Base match (8GB) and add cost of extra RAM from livePrices.

        return {
            price: basePrice,
            basis: baseMatch ? (baseMatch.isGeneric ? 'Promedio Genérico' : 'Histórico Exacto') : 'Sin Referencia',
            matchCount: baseMatch ? baseMatch.sampleCount : 0
        };
    }
}

export const priceEstimator = new PriceEstimator();
