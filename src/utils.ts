export enum LogLevel {
    off,
    error,
    info,
    debug,
    verbose,
}

// function format(date = `[${new Date().toLocaleString()}]`, tag, ...message) {
//     return [date, tag, ...message]
// }

export function logger(tag: string, level: LogLevel = LogLevel.error) {
    // const methods = {};
    // for (const levelName in LogLevel) {
    //     [levelName] = function (...message) {
    //         if (level >= LogLevel[levelName]) {
    //             console[levelName](...message);
    //         }
    //     };
    // }

    return {
        verbose(...message) {
            if (level >= LogLevel.verbose) {
                console.log(`[${new Date().toUTCString()}]`, `(${tag})`, ...message);
            }
        },
        debug(...message) {
            if (level >= LogLevel.debug) {
                console.debug(`[${new Date().toUTCString()}]`, `(${tag})`, ...message);
            }
        },
        info(...message) {
            if (level >= LogLevel.info) {
                console.info(`[${new Date().toUTCString()}]`, `(${tag})`, ...message);
            }
        },
        error(...message) {
            if (level >= LogLevel.error) {
                console.error(`[${new Date().toUTCString()}]`, `(${tag})`, ...message);
            }
        },
    };
}
