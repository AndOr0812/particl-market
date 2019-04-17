// Copyright (c) 2017-2019, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * as resources from 'resources';
import { ActionDirection } from '../../enums/ActionDirection';
import {AddressCreateRequest} from '../../requests/model/AddressCreateRequest';
import {CoreSmsgMessage} from '../../messages/CoreSmsgMessage';

export interface ModelCreateParams {
    //
}

export interface ListingItemCreateParams extends ModelCreateParams {
    marketId: number;
    rootCategory: resources.ItemCategory;
    msgid: string;
}

export interface BidCreateParams extends ModelCreateParams {
    listingItem: resources.ListingItem;
    address: AddressCreateRequest;
    bidder: string;
    msgid: string;
    parentBid?: resources.Bid;  // the bid that happened before this
}

export interface OrderCreateParams extends ModelCreateParams {
    bids: resources.Bid[];
    addressId: number;
    buyer: string;
    seller: string;
}

export interface ProposalCreateParams extends ModelCreateParams {
    msgid: string;
}

export interface VoteCreateParams extends ModelCreateParams {
    proposalOption: resources.ProposalOption;
    weight: number;
    msgid: string;
    create: boolean;
}

export interface SmsgMessageCreateParams extends ModelCreateParams {
    message: CoreSmsgMessage;
    direction: ActionDirection;
    target?: string;
}
