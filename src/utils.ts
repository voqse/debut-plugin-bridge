export enum LogLevel {
    off,
    error,
    info,
    debug,
    verbose,
}

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
                console.log(tag, ...message);
            }
        },
        debug(...message) {
            if (level >= LogLevel.debug) {
                console.debug(tag, ...message);
            }
        },
        info(...message) {
            if (level >= LogLevel.info) {
                console.info(tag, ...message);
            }
        },
        error(...message) {
            if (level >= LogLevel.error) {
                console.error(tag, ...message);
            }
        },
    };
}
