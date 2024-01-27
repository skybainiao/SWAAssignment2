export type Generator<T> = { next: () => T };

export type Position = {
    row: number;
    col: number;
};

export type Match<T> = {
    matched: T;
    positions: Position[];
};

export type Board<T> = {
    width: number;
    height: number;
    grid: T[][];
};

export type Effect<T> = Match<T> | { kind: "Refill", board: Board<T> };


export type MoveResult<T> = {
    board: Board<T>;
    effects: Effect<T>[];
};

// 创建一个新的游戏板
export function create<T>(generator: Generator<T>, width: number, height: number): Board<T> {
    const grid: T[][] = [];
    for (let i = 0; i < height; i++) {
        grid[i] = [];
        for (let j = 0; j < width; j++) {
            grid[i][j] = generator.next();
        }
    }
    return { width, height, grid };
}

// 获取某个位置上的元素
export function piece<T>(board: Board<T>, p: Position): T | undefined {
    if (p.row < 0 || p.row >= board.height || p.col < 0 || p.col >= board.width) {
        return undefined;
    }
    return board.grid[p.row][p.col];
}

// 检查两个位置的元素是否可以交换
export function canMove<T>(board: Board<T>, first: Position, second: Position): boolean {
    return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

// 执行移动
export function move<T>(generator: Generator<T>, board: Board<T>, first: Position, second: Position): MoveResult<T> {
    // 交换元素
    [board.grid[first.row][first.col], board.grid[second.row][second.col]] =
        [board.grid[second.row][second.col], board.grid[first.row][first.col]];

    // 检查匹配并移除
    const matches: Match<T>[] = findMatches(board);

    // 将 Match<T>[] 转换为 Effect<T>[]
    const matchEffects: Effect<T>[] = matches.map(match => ({ kind: "Match", ...match }));

    removeMatches(board, matches);

    // 补充缺失的元素
    refillBoard(board, generator);

    // 返回移动结果
    return {
        board,
        effects: matchEffects.concat({ kind: "Refill", board })
    };
}


export function findMatches<T>(board: Board<T>): Match<T>[] {
    const matches: Match<T>[] = [];

    for (let row = 0; row < board.height; row++) {
        let startCol = 0;
        while (startCol < board.width) {
            const matched = board.grid[row][startCol];
            let endCol = startCol;

            while (endCol < board.width && board.grid[row][endCol] === matched) {
                endCol++;
            }

            if (endCol - startCol >= 3) { // 至少三个相同才算匹配
                const positions: Position[] = [];
                for (let col = startCol; col < endCol; col++) {
                    positions.push({ row, col });
                }
                matches.push({ matched, positions });
            }

            startCol = endCol;
        }
    }

    return matches;
}

export function removeMatches<T>(board: Board<T>, matches: Match<T>[]): void {
    for (const match of matches) {
        for (const pos of match.positions) {
            // 将匹配位置的元素标记为 null 或其他标记值
            board.grid[pos.row][pos.col] = null as unknown as T;
        }
    }

    // 从底部开始，确保所有标记为 null 的元素向下移动
    for (let col = 0; col < board.width; col++) {
        for (let row = board.height - 1; row >= 0; row--) {
            if (board.grid[row][col] === null) {
                // 向上移动直到非空格或顶部
                let nextRow = row - 1;
                while (nextRow >= 0 && board.grid[nextRow][col] === null) {
                    nextRow--;
                }
                if (nextRow >= 0) {
                    board.grid[row][col] = board.grid[nextRow][col];
                    board.grid[nextRow][col] = null as unknown as T;
                }
            }
        }
    }
}

export function refillBoard<T>(board: Board<T>, generator: Generator<T>): void {
    for (let col = 0; col < board.width; col++) {
        for (let row = 0; row < board.height; row++) {
            if (board.grid[row][col] === null) {
                board.grid[row][col] = generator.next();
            }
        }
    }
}


