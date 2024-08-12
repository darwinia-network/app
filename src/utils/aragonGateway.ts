import {JsonRpcProvider, Networkish} from '@ethersproject/providers';
import {
  CHAIN_METADATA,
  NETWORKS_WITH_CUSTOM_REGISTRY,
  SupportedNetworks,
  getSupportedNetworkByChainId,
} from './constants';
import {translateToNetworkishName} from './library';
import {
  SupportedNetworks as SdkSupportedNetworks,
  getLatestNetworkDeployment,
} from '@aragon/osx-commons-configs';

class AragonGateway {
  private rpcVersion = '1.0';
  private ipfsVersion = '1.0';
  private baseUrl = {
    darwinia: 'https://rpc.darwinia.network',
    crab: 'https://crab-rpc.darwinia.network',
    koi: 'https://koi-rpc.darwinia.network',
  }
  private ipfsUrl = import.meta.env.VITE_IPFS_URL as string;

  getRpcProvider = (
    chainIdOrNetwork: number | SupportedNetworks
  ): JsonRpcProvider => {
    let network = this.parseNetwork(chainIdOrNetwork);

    // Default provider to ethereum for unsupported networks
    if (network == null || network === 'unsupported') {
      network = 'ethereum';
    }

    const sdkNetwork = translateToNetworkishName(
      network
    ) as SdkSupportedNetworks;

    const options: Networkish = {
      chainId: CHAIN_METADATA[network].id,
      name: sdkNetwork,
    };

    if (NETWORKS_WITH_CUSTOM_REGISTRY.includes(network)) {
      options.ensAddress =
        getLatestNetworkDeployment(sdkNetwork)?.ENSRegistry?.address;
    }

    const rpcUrl = this.buildRpcUrl(network)!;
    return new JsonRpcProvider(rpcUrl, options);
  };

  buildRpcUrl = (
    chainIdOrNetwork: number | SupportedNetworks
  ): string | null => {
    const network = this.parseNetwork(chainIdOrNetwork);

    if (network == null || network === 'unsupported') {
      return null;
    }

    return this.baseUrl[network];
  };

  buildIpfsUrl = (
    chainIdOrNetwork: number | SupportedNetworks
  ): string | null => {
    const network = this.parseNetwork(chainIdOrNetwork);

    if (network == null || network === 'unsupported') {
      return null;
    }

    const ipfsUrl = `${this.ipfsUrl}/api/v0`;

    return ipfsUrl;
  };

  private parseNetwork = (
    chainIdOrNetwork: number | SupportedNetworks
  ): SupportedNetworks | undefined => {
    const network =
      typeof chainIdOrNetwork === 'number'
        ? getSupportedNetworkByChainId(chainIdOrNetwork)
        : chainIdOrNetwork;

    return network;
  };
}

export const aragonGateway = new AragonGateway();
