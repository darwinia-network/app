import {
  ApproveMultisigProposalParams,
  VoteProposalParams,
  VoteValues,
} from '@aragon/sdk-client';
import {PluginTypes} from 'hooks/usePluginClient';
import {useParams} from 'react-router-dom';
import {ProposalId} from 'utils/types';

class VoteOrApprovalUtils {
  buildVoteOrApprovalParams = (
    PluginType: PluginTypes,
    tryExecution: boolean,
    vote?: VoteValues
  ) => {
    let param: VoteProposalParams | ApproveMultisigProposalParams | undefined =
      undefined;
    const {id: urlId} = useParams();
    const proposalId = new ProposalId(urlId!).export();

    switch (PluginType) {
      case 'token-voting.plugin.echo77.eth':
      case 'vocdoni-gasless-voting-poc-vanilla-erc20.plugin.echo77.eth': {
        param = {
          proposalId,
          vote: vote as VoteValues,
        };
        break;
      }
      case 'multisig.plugin.echo77.eth': {
        param = {
          proposalId,
          tryExecution,
        };
        break;
      }
      default:
        throw new Error(`Unknown plugin type`);
    }

    return param;
  };
}

export const voteOrApprovalUtils = new VoteOrApprovalUtils();
