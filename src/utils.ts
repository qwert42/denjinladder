export function tap<T>(value: T): { do: (f: (v: T) => void) => T } {
    return {
        do: (func) => {
            func(value);
            return value;
        }
    };
}
