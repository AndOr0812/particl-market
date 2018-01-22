import { inject, named } from 'inversify';
import { RpcRequest } from '../../requests/RpcRequest';
import { RootRpcCommand } from '../RootRpcCommand';
import { RpcCommandInterface } from '../RpcCommandInterface';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { FavoriteAddCommand } from './FavoriteAddCommand';
import { FavoriteRemoveCommand } from './FavoriteRemoveCommand';

export class FavoriteRootCommand extends RootRpcCommand {
    public log: LoggerType;
    public commands: Array<RpcCommandInterface<any>>;
    public name: string;
    public helpStr: string;

    constructor(
        @inject(Types.Command) @named(Targets.Command.favorite.FavoriteAddCommand) private favoriteAddCommand: FavoriteAddCommand,
        @inject(Types.Command) @named(Targets.Command.favorite.FavoriteRemoveCommand) private favoriteRemoveCommand: FavoriteRemoveCommand,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        super(Logger);

        this.name = 'favorite';
        this.helpStr = 'favorite (add|remove) asd';

        this.commands.push(favoriteAddCommand);
        this.commands.push(favoriteRemoveCommand);
    }

    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest): Promise<any> {
        return super.execute(data);
    }

    public help(): string {
        return this.helpStr;
    }
}
