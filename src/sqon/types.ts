//A poor' s man sqon type.
export type Sqon = {
    op: string;
    content: any;
    [key: string]: any;
};