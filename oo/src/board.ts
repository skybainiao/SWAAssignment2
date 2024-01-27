export type Generator<T> = { next: () => T };

export type Position = {
    row: number;
    col: number;
};

export type Match<T> = {
    matched: T;
    positions: Position[];
};

export type BoardEvent<T> = {
    type: 'match' | 'refill';
    detail?: Match<T>;
};

export type BoardListener<T> = (event: BoardEvent<T>) => void;

export class Board<T> {
    readonly width: number;
    readonly height: number;
    private grid: T[][];
    private generator: Generator<T>;
    private listeners: BoardListener<T>[] = [];

    constructor(generator: Generator<T>, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.generator = generator;
        this.grid = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => generator.next()));
    }

    addListener(listener: BoardListener<T>) {
        this.listeners.push(listener);
    }

    positions(): Position[] {
        return this.grid.flatMap((row, rowIndex) =>
            row.map((_, colIndex) => ({ row: rowIndex, col: colIndex })));
    }

    piece(p: Position): T | undefined {
        if (p.row >= 0 && p.row < this.height && p.col >= 0 && p.col < this.width) {
            return this.grid[p.row][p.col];
        }
        return undefined;
    }

    canMove(first: Position, second: Position): boolean {
        return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
    }

    move(first: Position, second: Position) {
        [this.grid[first.row][first.col], this.grid[second.row][second.col]] =
            [this.grid[second.row][second.col], this.grid[first.row][first.col]];

        const matches: Match<T>[] = this.findMatches();
        this.removeMatches(matches);
        this.refillBoard();

        matches.forEach(match => this.listeners.forEach(listener => listener({
            type: 'match',
            detail: match
        })));
        this.listeners.forEach(listener => listener({ type: 'refill' }));
    }

    findMatches(): Match<T>[] {
        const matches: Match<T>[] = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 2; col++) {
                const matched = this.grid[row][col];
                if (matched && matched === this.grid[row][col + 1] && matched === this.grid[row][col + 2]) {
                    const positions: Position[] = [{ row, col }, { row, col: col + 1 }, { row, col: col + 2 }];
                    matches.push({ matched, positions });
                }
            }
        }
        return matches;
    }

    removeMatches(matches: Match<T>[]) {
        for (const match of matches) {
            for (const pos of match.positions) {
                this.grid[pos.row][pos.col] = null as unknown as T;
            }
        }
        for (let col = 0; col < this.width; col++) {
            let emptyRow = this.height - 1;
            for (let row = this.height - 1; row >= 0; row--) {
                if (this.grid[row][col] === null) {
                    continue;
                }
                if (row !== emptyRow) {
                    this.grid[emptyRow][col] = this.grid[row][col];
                    this.grid[row][col] = null as unknown as T;
                }
                emptyRow--;
            }
        }
    }

    refillBoard() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.grid[row][col] === null) {
                    this.grid[row][col] = this.generator.next();
                }
            }
        }
    }
}
