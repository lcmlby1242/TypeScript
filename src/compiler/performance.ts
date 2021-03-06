/*@internal*/
/** Performance measurements for the compiler. */
namespace ts.performance {
    let perfHooks: PerformanceHooks | undefined;
    let perfObserver: PerformanceObserver | undefined;
    let perfEntryList: PerformanceObserverEntryList | undefined;
    // when set, indicates the implementation of `Performance` to use for user timing.
    // when unset, indicates user timing is unavailable or disabled.
    let performanceImpl: Performance | undefined;

    export interface Timer {
        enter(): void;
        exit(): void;
    }

    export function createTimerIf(condition: boolean, measureName: string, startMarkName: string, endMarkName: string) {
        return condition ? createTimer(measureName, startMarkName, endMarkName) : nullTimer;
    }

    export function createTimer(measureName: string, startMarkName: string, endMarkName: string): Timer {
        let enterCount = 0;
        return {
            enter,
            exit
        };

        function enter() {
            if (++enterCount === 1) {
                mark(startMarkName);
            }
        }

        function exit() {
            if (--enterCount === 0) {
                mark(endMarkName);
                measure(measureName, startMarkName, endMarkName);
            }
            else if (enterCount < 0) {
                Debug.fail("enter/exit count does not match.");
            }
        }
    }

    export const nullTimer: Timer = { enter: noop, exit: noop };

    /**
     * Marks a performance event.
     *
     * @param markName The name of the mark.
     */
    export function mark(markName: string) {
        performanceImpl?.mark(markName);
    }

    /**
     * Adds a performance measurement with the specified name.
     *
     * @param measureName The name of the performance measurement.
     * @param startMarkName The name of the starting mark. If not supplied, the point at which the
     *      profiler was enabled is used.
     * @param endMarkName The name of the ending mark. If not supplied, the current timestamp is
     *      used.
     */
    export function measure(measureName: string, startMarkName?: string, endMarkName?: string) {
        performanceImpl?.measure(measureName, startMarkName, endMarkName);
    }

    /**
     * Gets the number of times a marker was encountered.
     *
     * @param markName The name of the mark.
     */
    export function getCount(markName: string) {
        return perfEntryList?.getEntriesByName(markName, "mark").length || 0;
    }

    /**
     * Gets the total duration of all measurements with the supplied name.
     *
     * @param measureName The name of the measure whose durations should be accumulated.
     */
    export function getDuration(measureName: string) {
        return perfEntryList?.getEntriesByName(measureName, "measure").reduce((a, entry) => a + entry.duration, 0) || 0;
    }

    /**
     * Iterate over each measure, performing some action
     *
     * @param cb The action to perform for each measure
     */
    export function forEachMeasure(cb: (measureName: string, duration: number) => void) {
        perfEntryList?.getEntriesByType("measure").forEach(({ name, duration }) => { cb(name, duration); });
    }

    /**
     * Indicates whether the performance API is enabled.
     */
    export function isEnabled() {
        return !!performanceImpl;
    }

    /** Enables (and resets) performance measurements for the compiler. */
    export function enable() {
        if (!performanceImpl) {
            perfHooks ||= tryGetNativePerformanceHooks();
            if (!perfHooks) return false;
            perfObserver ||= new perfHooks.PerformanceObserver(list => perfEntryList = list);
            perfObserver.observe({ entryTypes: ["mark", "measure"] });
            performanceImpl = perfHooks.performance;
        }
        return true;
    }

    /** Disables performance measurements for the compiler. */
    export function disable() {
        perfObserver?.disconnect();
        performanceImpl = undefined;
    }
}
