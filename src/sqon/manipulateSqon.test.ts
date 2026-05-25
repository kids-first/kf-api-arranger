import { vi } from 'vitest';
import { SetSqon } from '../endpoints/sets/setsTypes.js';
import { addSqonToSetSqon, removeSqonToSetSqon } from './manipulateSqon.js';

describe('addSqonToSetSqon', () => {
    const sqon1: SetSqon = {
        op: 'and',
        content: [{ op: 'in', content: { field: 'affected_status', value: ['false'] } }],
    };

    const sqon2: SetSqon = {
        op: 'and',
        content: [{ op: 'in', content: { field: 'gender', value: ['Female'] } }],
    };

    it('should combine 2 sqon with: A || B', () => {
        const expectedSqon: SetSqon = {
            op: 'or',
            content: [
                {
                    op: 'and',
                    content: [{ op: 'in', content: { field: 'affected_status', value: ['false'] } }],
                },
                {
                    op: 'and',
                    content: [{ op: 'in', content: { field: 'gender', value: ['Female'] } }],
                },
            ],
        };

        const combineSqon = addSqonToSetSqon(sqon1, sqon2);
        expect(combineSqon).toEqual(expectedSqon);
    });
});

describe('removeSqonToSetSqon', () => {
    const sqon1: SetSqon = {
        op: 'and',
        content: [{ op: 'in', content: { field: 'affected_status', value: ['false'] } }],
    };

    const sqon2: SetSqon = {
        op: 'and',
        content: [{ op: 'in', content: { field: 'gender', value: ['Female'] } }],
    };

    it('should combine 2 sqon with: A && !B', () => {
        const expectedSqon: SetSqon = {
            op: 'and',
            content: [
                {
                    op: 'and',
                    content: [{ op: 'in', content: { field: 'affected_status', value: ['false'] } }],
                },
                {
                    op: 'not',
                    content: [
                        {
                            op: 'and',
                            content: [{ op: 'in', content: { field: 'gender', value: ['Female'] } }],
                        },
                    ],
                },
            ],
        };

        const combineSqon = removeSqonToSetSqon(sqon1, sqon2);
        expect(combineSqon).toEqual(expectedSqon);
    });
});
