export type Content = any;
//A poor' s man sqon type.
export type Sqon = {
    op: string;
    content: Content;
    [key: string]: any;
};
