import { CONSTANTS } from '@arranger/middleware';
import { get } from 'lodash';

import { idKey } from '../../env';
import { SetSqon } from '../sets/setsTypes';
import { SearchByIdsResult, SourceType } from './searchByIdsTypes';

const query = `query ($sqon: JSON, $size: Int, $offset: Int) {
  participant {
    hits (filters: $sqon, first:$size, offset:$offset){
      edges {
        node {
          ${idKey}
          biospecimens {
            hits {
              edges {
                node {
                  ${idKey}   
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const getSqon = (ids = []): SetSqon => ({
    op: CONSTANTS.AND_OP,
    content: [
        {
            op: CONSTANTS.IN_OP,
            content: {
                field: `biospecimens.${idKey}`,
                value: ids,
            },
        },
    ],
});

const transform = (data: unknown, ids: string[]): SearchByIdsResult[] => {
    const participants = get(data, 'participant', []).filter(p => !!p);

    return ids.map(id => {
        const participantIds = participants
            .filter(participant => {
                const biospecimens = get(participant, 'biospecimens', []);
                return biospecimens.some(bio => bio[idKey] === id);
            })
            .map(participant => participant[idKey]);

        return {
            search: id,
            type: 'BIOSPECIMEN',
            participantIds,
        };
    });
};

export const byBiospecimenId: SourceType = {
    query,
    getSqon,
    transform,
};
