// Copyright (c) 2017-2019, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as _ from 'lodash';
import * as resources from 'resources';
import { inject, named } from 'inversify';
import { ompVersion } from 'omp-lib';
import { Logger as LoggerType } from '../../../core/Logger';
import { Core, Targets, Types } from '../../../constants';
import { EventEmitter } from 'events';
import { BidService } from '../model/BidService';
import { BidFactory } from '../../factories/model/BidFactory';
import { SmsgService } from '../SmsgService';
import { ListingItemService } from '../model/ListingItemService';
import { SmsgSendResponse } from '../../responses/SmsgSendResponse';
import { MarketplaceMessage } from '../../messages/MarketplaceMessage';
import { OrderService } from '../model/OrderService';
import { SmsgMessageService } from '../model/SmsgMessageService';
import { BaseActionService } from './BaseActionService';
import { SmsgMessageFactory } from '../../factories/model/SmsgMessageFactory';
import { BidCreateParams } from '../../factories/model/ModelCreateParams';
import { BidCreateRequest } from '../../requests/model/BidCreateRequest';
import { OrderStatus } from '../../enums/OrderStatus';
import { OrderItemService } from '../model/OrderItemService';
import { OrderItemStatus } from '../../enums/OrderItemStatus';
import { BidCancelRequest } from '../../requests/action/BidCancelRequest';
import { BidCancelMessage } from '../../messages/action/BidCancelMessage';
import { BidCancelMessageFactory } from '../../factories/message/BidCancelMessageFactory';
import { BidCancelMessageCreateParams } from '../../requests/message/BidCancelMessageCreateParams';
import { BidCancelValidator } from '../../messages/validator/BidCancelValidator';

export class BidCancelActionService extends BaseActionService {

    constructor(
        @inject(Types.Service) @named(Targets.Service.SmsgService) public smsgService: SmsgService,
        @inject(Types.Service) @named(Targets.Service.model.SmsgMessageService) public smsgMessageService: SmsgMessageService,
        @inject(Types.Factory) @named(Targets.Factory.model.SmsgMessageFactory) public smsgMessageFactory: SmsgMessageFactory,

        @inject(Types.Service) @named(Targets.Service.model.BidService) public bidService: BidService,
        @inject(Types.Service) @named(Targets.Service.model.OrderService) public orderService: OrderService,
        @inject(Types.Service) @named(Targets.Service.model.OrderItemService) public orderItemService: OrderItemService,
        @inject(Types.Factory) @named(Targets.Factory.model.BidFactory) public bidFactory: BidFactory,
        @inject(Types.Factory) @named(Targets.Factory.message.BidCancelMessageFactory) public bidCancelMessageFactory: BidCancelMessageFactory,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        super(smsgService, smsgMessageService, smsgMessageFactory);
        this.log = new Logger(__filename);
    }

    /**
     * create the MarketplaceMessage to which is to be posted to the network
     *
     * - generate BidCancelMessage
     *
     * @param params
     */
    public async createMessage(params: BidCancelRequest): Promise<MarketplaceMessage> {

        const actionMessage: BidCancelMessage = await this.bidCancelMessageFactory.get({
            bidHash: params.bid.hash
        } as BidCancelMessageCreateParams);

        return {
            version: ompVersion(),
            action: actionMessage
        } as MarketplaceMessage;
    }

    /**
     * validate the MarketplaceMessage to which is to be posted to the network.
     * called directly after createMessage to validate the creation.
     *
     * @param marketplaceMessage
     */
    public async validateMessage(marketplaceMessage: MarketplaceMessage): Promise<boolean> {
        return BidCancelValidator.isValid(marketplaceMessage);
    }

    /**
     * called after createMessage and before post is executed and message is sent
     *
     * - create the bidCreateRequest to save the Bid (MPA_CANCEL) in the Database
     *   - the previous Bid should be added as parentBid to create the relation
     * - call createBid to create the Bid and update Order and OrderItem statuses
     *
     * @param params
     * @param marketplaceMessage, generated MPA_CANCEL
     */
    public async beforePost(params: BidCancelRequest, marketplaceMessage: MarketplaceMessage): Promise<MarketplaceMessage> {

        // msgid is not set here, its updated in the afterPost
        const bidCreateParams = {
            listingItem: params.bid.ListingItem,
            bidder: params.bid.bidder,
            parentBid: params.bid
        } as BidCreateParams;

        return await this.bidFactory.get(bidCreateParams, marketplaceMessage.action as BidCancelMessage)
            .then(async bidCreateRequest => {
                return await this.createBid(marketplaceMessage.action as BidCancelMessage, bidCreateRequest)
                    .then(value => {

                        params.createdBid = value;
                        return marketplaceMessage;
                    });
            });
    }

    /**
     * called after post is executed and message is sent
     *
     * @param params
     * @param marketplaceMessage
     * @param smsgSendResponse
     */
    public async afterPost(params: BidCancelRequest, marketplaceMessage: MarketplaceMessage,
                           smsgSendResponse: SmsgSendResponse): Promise<SmsgSendResponse> {
        // todo: stupid fix for possible undefined which shouldnt even happen, fix the real cause
        smsgSendResponse.msgid =  smsgSendResponse.msgid ? smsgSendResponse.msgid : '';
        await this.bidService.updateMsgId(params.createdBid.id, smsgSendResponse.msgid);
        return smsgSendResponse;
    }

    /**
     * - create the Bid (MPA_CANCEL) (+BidDatas copied from parentBid), with previous Bid (MPA_BID) as the parentBid
     * - update OrderItem.status -> AWAITING_ESCROW
     * - update Order.status
     *
     * @param bidCancelMessage
     * @param bidCreateRequest
     */
    public async createBid(bidCancelMessage: BidCancelMessage, bidCreateRequest: BidCreateRequest): Promise<resources.Bid> {

        // TODO: currently we support just one OrderItem per Order
        return await this.bidService.create(bidCreateRequest)
            .then(async value => {
                const bid: resources.Bid = value.toJSON();

                await this.orderItemService.updateStatus(bid.ParentBid.OrderItem.id, OrderItemStatus.BID_CANCELLED);
                await this.orderService.updateStatus(bid.ParentBid.OrderItem.Order.id, OrderStatus.CANCELED);

                return await this.bidService.findOne(bid.id, true).then(bidModel => bidModel.toJSON());
            });
    }
}
