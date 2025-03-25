const os = require('os');
const fs = require('fs');
const net = require('net');
const http = require('http');
const axios = require('axios');
const { Buffer } = require('buffer');
const { exec, execSync } = require('child_process');

// 环境变量
const UUID = process.env.UUID || 'a2056d0d-c98e-4aeb-9aab-37f64edd5710'; // 使用哪吒v1，在不同的平台部署需修改UUID，否则会覆盖
const NEZHA_SERVER = process.env.NEZHA_SERVER || '';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || '';
const AUTO_ACCESS = process.env.AUTO_ACCESS || false;
const SUB_PATH = process.env.SUB_PATH || 'sub';
const XPATH = process.env.XPATH || 'xhttp';
const DOMAIN = process.env.DOMAIN || '';
const NAME = process.env.NAME || 'Vls';
const PORT = process.env.PORT || 3000;

// 核心配置
const SETTINGS = {
    ['UUID']: UUID,
    ['LOG_LEVEL']: 'none',
    ['BUFFER_SIZE']: '2048',
    ['XPATH']: `%2F${XPATH}`,
    ['MAX_BUFFERED_POSTS']: 30,
    ['MAX_POST_SIZE']: 1000000,
    ['SESSION_TIMEOUT']: 30000,
    ['CHUNK_SIZE']: 1024 * 1024,
    ['TCP_NODELAY']: true,
    ['TCP_KEEPALIVE']: true,
}

function validate_uuid(left, right) {
    for (let i = 0; i < 16; i++) {
        if (left[i] !== right[i]) return false
    }
    return true
}

function concat_typed_arrays(first, ...args) {
    if (!args || args.length < 1) return first
    let len = first.length
    for (let a of args) len += a.length
    const r = new first.constructor(len)
    r.set(first, 0)
    len = first.length
    for (let a of args) {
        r.set(a, len)
        len += a.length
    }
    return r
}

// 扩展日志函数
function log(type, ...args) {
    if (SETTINGS.LOG_LEVEL === 'none') return;

    const levels = {
        'debug': 0,
        'info': 1,
        'warn': 2,
        'error': 3
    };

    const colors = {
        'debug': '\x1b[36m', // 青色
        'info': '\x1b[32m',  // 绿色
        'warn': '\x1b[33m',  // 黄色
        'error': '\x1b[31m', // 红色
        'reset': '\x1b[0m'    // 重置
    };

    const configLevel = levels[SETTINGS.LOG_LEVEL] || 1;
    const messageLevel = levels[type] || 0;

    if (messageLevel >= configLevel) {
        const time = new Date().toISOString();
        const color = colors[type] || colors.reset;
        console.log(`<span class="math-inline">\{color\}\[</span>{time}] [${type}]`, ...args, colors.reset);
    }
}

// const getDownloadUrl = () => {
//     const arch = os.arch();
//     if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
//       if (!NEZHA_PORT) {
//         return 'https://arm64.ssss.nyc.mn/v1';
//       } else {
//           return 'https://arm64.ssss.nyc.mn/agent';
//       }
//     } else {
//       if (!NEZHA_PORT) {
//         return 'https://amd64.ssss.nyc.mn/v1';
//       } else {
//           return 'https://amd64.ssss.nyc.mn/agent';
//       }
//     }
// };

// const downloadFile = async () => {
//     if (!NEZHA_KEY) return;
//     try {
//       const url = getDownloadUrl();
//       // console.log(`Start downloading file from ${url}`);
//       const response = await axios({
//         method: 'get',
//         url: url,
//         responseType: 'stream'
//       });

//       const writer = fs.createWriteStream('npm');
//       response.data.pipe(writer);

//       return new Promise((resolve, reject) => {
//         writer.on('finish', () => {
//           console.log('npm download successfully');
//           exec('chmod +x npm', (err) => {
//             if (err) reject(err);
//             resolve();
//           });
//         });
//         writer.on('error', reject);
//       });
//     } catch (err) {
//       throw err;
//     }
// };

// const runnz = async () => {
//     await downloadFile();
//     let NEZHA_TLS = '';
//     let command = '';

//     if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
//       const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
//       NEZHA_TLS = tlsPorts.includes(NEZHA_PORT) ? '--tls' : '';
//       command = `nohup ./npm -s <span class="math-inline">\{NEZHA\_SERVER\}\:</span>{NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`;
//     } else if (NEZHA_SERVER && NEZHA_KEY) {
//       if (!NEZHA_PORT) {
//         const configYaml = `
// client_secret: ${NEZHA_KEY}
// debug: false
// disable_auto_update: true
// disable_command_execute: false
// disable_force_update: true
// disable_nat: false
// disable_send_query: false
// gpu: false
// insecure_tls: false
// ip_report_period: 1800
// report_delay: 1
// server: ${NEZHA_SERVER}
// skip_connection_count: false
// skip_procs_count: false
// temperature: false
// tls: false
// use_gitee_to_upgrade: false
// use_ipv6_country_code: false
// uuid: ${UUID}`;

//         fs.writeFileSync('config.yaml', configYaml);
//       }
//       command = `nohup ./npm -c config.yaml >/dev/null 2>&1 &`;
//     } else {
//       // console.log('NEZHA variable is empty, skip running');
//       return;
//     }

//     try {
//       exec(command, {
//         shell: '/bin/bash'
//       });
//       console.log('npm is running');
//     } catch (error) {
//       console.error(`npm running error: ${error}`);
//     }
// };

// 添加自动任务
async function addAccessTask() {
    if (AUTO_ACCESS !== true) return;
    try {
        if (!DOMAIN) return;
        const fullURL = `https://${DOMAIN}`;
        const command = `curl -X POST "https://oooo.serv00.net/add-url" -H "Content-Type: application/json" -d '{"url": "${fullURL}"}'`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error sending request:', error.message);
                return;
            }
            console.log('Automatic Access Task added successfully:', stdout);
        });
    } catch (error) {
        console.error('Error added Task:', error.message);
    }
}

// VLESS 协议解析
function parse_uuid(uuid) {
    uuid = uuid.replaceAll('-', '')
    const r = []
    for (let index = 0; index < 16; index++) {
        r.push(parseInt(uuid.substr(index * 2, 2), 16))
    }
    return r
}

async function read_vless_header(reader, cfg_uuid_str) {
    let readed_len = 0
    let header = new Uint8Array()
    let read_result = { value: header, done: false }
    async function inner_read_until(offset) {
        if (read_result.done) {
            throw new Error('header length too short')
        }
        const len = offset - readed_len
        if (len < 1) {
            return
        }
        read_result = await read_atleast(reader, len)
        readed_len += read_result.value.length
        header = concat_typed_arrays(header, read_result.value)
    }

    await inner_read_until(1 + 16 + 1)

    const version = header[0]
    const uuid = header.slice(1, 1 + 16)
    const cfg_uuid = parse_uuid(cfg_uuid_str)
    if (!validate_uuid(uuid, cfg_uuid)) {
        throw new Error(`invalid UUID`)
    }
    const pb_len = header[1 + 16]
    const addr_plus1 = 1 + 16 + 1 + pb_len + 1 + 2 + 1
    await inner_read_until(addr_plus1 + 1)

    const cmd = header[1 + 16 + 1 + pb_len]
    const COMMAND_TYPE_TCP = 1
    if (cmd !== COMMAND_TYPE_TCP) {
        throw new Error(`unsupported command: ${cmd}`)
    }

    const port = (header[addr_plus1 - 1 - 2] << 8) + header[addr_plus1 - 1 - 1]
    const atype = header[addr_plus1 - 1]

    const ADDRESS_TYPE_IPV4 = 1
    const ADDRESS_TYPE_STRING = 2
    const ADDRESS_TYPE_IPV6 = 3
    let header_len = -1
    if (atype === ADDRESS_TYPE_IPV4) {
        header_len = addr_plus1 + 4
    } else if (atype === ADDRESS_TYPE_IPV6) {
        header_len = addr_plus1 + 16
    } else if (atype === ADDRESS_TYPE_STRING) {
        header_len = addr_plus1 + 1 + header[addr_plus1]
    }
    if (header_len < 0) {
        throw new Error('read address type failed')
    }
    await inner_read_until(header_len)

    const idx = addr_plus1
    let hostname = ''
    if (atype === ADDRESS_TYPE_IPV4) {
        hostname = header.slice(idx, idx + 4).join('.')
    } else if (atype === ADDRESS_TYPE_STRING) {
        hostname = new TextDecoder().decode(
            header.slice(idx + 1, idx + 1 + header[idx]),
        )
    } else if (atype === ADDRESS_TYPE_IPV6) {
        hostname = header
            .slice(idx, idx + 16)
            .reduce(
                (s, b2, i2, a) =>
                    i2 % 2 ? s.concat(((a[i2 - 1] << 8) + b2).toString(16)) : s,
                [],
            )
            .join(':')
    }

    if (!hostname) {
        log('error', 'Failed to parse hostname');
        throw new Error('parse hostname failed')
    }

    log('info', `VLESS connection to <span class="math-inline">\{hostname\}\:</span>{port}`);
    return {
        hostname,
        port,
        data: header.slice(header_len),
        resp: new Uint8Array([version, 0]),
    }
}

// read_atleast 函数
async function read_atleast(reader, n) {
    const buffs = []
    let done = false
    while (n > 0 && !done) {
        const r = await reader.read()
        if (r.value) {
            const b = new Uint8Array(r.value)
            buffs.push(b)
            n -= b.length
        }
        done = r.done
    }
    if (n > 0) {
        throw new Error(`not enough data to read`)
    }
    return {
        value: concat_typed_arrays(...buffs),
        done,
    }
}

// parse_header 函数
async function parse_header(uuid_str, client) {
    log('debug', 'Starting to parse VLESS header');
    const reader = client.readable.getReader()
    try {
        const vless = await read_vless_header(reader, uuid_str)
        log('debug', 'VLESS header parsed successfully');
        return vless
    } catch (err) {
        log('error', `VLESS header parse error: ${err.message}`);
        throw new Error(`read vless header error: ${err.message}`)
    } finally {
        reader.releaseLock()
    }
}

// connect_remote 函数
async function connect_remote(hostname, port) {
    const timeout = 8000;
    try {
        const conn = await timed_connect(hostname, port, timeout);

        // 优化 TCP 连接
        conn.setNoDelay(true);  // 启用 TCP_NODELAY
        conn.setKeepAlive(true, 1000);   // 启用 TCP keepalive

        // 设置缓冲区大小
        conn.bufferSize = parseInt(SETTINGS.BUFFER_SIZE) * 1024;

        log('info', `Connected to <span class="math-inline">\{hostname\}\:</span>{port}`);
        return conn;
    } catch (err) {
        log('error', `Connection failed: ${err.message}`);
        throw err;
    }
}

// timed_connect 函数
function timed_connect(hostname, port, ms) {
    return new Promise((resolve, reject) => {
        const conn = net.createConnection({ host: hostname, port: port })
        const handle = setTimeout(() => {
            reject(new Error(`connect timeout`))
        }, ms)
        conn.on('connect', () => {
            clearTimeout(handle)
            resolve(conn)
        })
        conn.on('error', (err) => {
            clearTimeout(handle)
            reject(err)
        })
    })
}

// 网络传输
function pipe_relay() {
    async function pump(src, dest, first_packet) {
        const chunkSize = parseInt(SETTINGS.CHUNK_SIZE);

        if (first_packet.length > 0) {
            if (dest.write) {
                dest.cork(); // 合并多个小数据包
                dest.write(first_packet);
                process.nextTick(() => dest.uncork());
            } else {
                const writer = dest.writable.getWriter();
                try {
                    await writer.write(first_packet);
                } finally {
                    writer.releaseLock();
                }
            }
        }

        try {
            if (src.pipe) {
                // 优化 Node.js Stream
                src.pause();
                src.pipe(dest, {
                    end: true,
                    highWaterMark: chunkSize
                });
                src.resume();
            } else {
                // 优化 Web Stream
                await src.readable.pipeTo(dest.writable, {
                    preventClose: false,
                    preventAbort: false,
                    preventCancel: false,
                    signal: AbortSignal.timeout(SETTINGS.SESSION_TIMEOUT)
                });
            }
        } catch (err) {
            if (!err.message.includes('aborted')) {
                log('error', 'Relay error:', err.message);
            }
            throw err;
        }
    }
    return pump;
}

// socketToWebStream 函数
function socketToWebStream(socket) {
    let readController;
    let writeController;

    socket.on('error', (err) => {
        log('error', 'Socket error:', err.message);
        readController?.error(err);
        writeController?.error(err);
    });

    return {
        readable: new ReadableStream({
            start(controller) {
                readController = controller;
                socket.on('data', (chunk) => {
                    try {
                        controller.enqueue(chunk);
                    } catch (err) {
                        log('error', 'Read controller error
